-- =============================================================================
-- HEBRA · Fase 5 Enterprise: proveedores, lotes (historial de recepción),
-- órdenes de compra con reorden automático, y transferencias entre sedes.
-- Aditiva: nada se borra ni se recrea. supplies.quantity_remaining/
-- quantity_purchased/total_cost siguen siendo la fuente de verdad del stock —
-- unit_cost sigue siendo la columna generada de siempre (total_cost /
-- quantity_purchased), así que el costo promedio ponderado sale solo con que
-- cada lote nuevo sume su cantidad y su valor ahí. El trigger que descuenta
-- insumos al enviar un pedido (consume_order_supplies, de la migración 0001)
-- no se toca. Ejecuta en Supabase → SQL Editor después del 0011.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Proveedores
-- ---------------------------------------------------------------------------
create table suppliers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  contact text,
  created_at timestamptz not null default now()
);
create index suppliers_tenant_idx on suppliers(tenant_id);

alter table supplies add column supplier_id uuid references suppliers(id) on delete set null;

alter table suppliers enable row level security;
create policy suppliers_select on suppliers for select using (is_member(tenant_id));
create policy suppliers_insert on suppliers for insert with check (has_role(tenant_id, 'admin'));
create policy suppliers_update on suppliers for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));
create policy suppliers_delete on suppliers for delete using (has_role(tenant_id, 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Lotes: historial de cada recepción (compra manual o de una OC). No es la
--    fuente de verdad del stock — solo registra de dónde salió cada aumento.
-- ---------------------------------------------------------------------------
create table supply_lots (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  supply_id uuid not null references supplies(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  lot_code text,
  quantity_received numeric(12,2) not null check (quantity_received > 0),
  unit_cost numeric(14,4) not null,
  received_at date not null default current_date,
  purchase_order_id uuid,
  created_at timestamptz not null default now()
);
create index supply_lots_supply_idx on supply_lots(supply_id);

alter table supply_lots enable row level security;
create policy supply_lots_select on supply_lots for select using (is_member(tenant_id));
-- Sin insert/update/delete directo: solo vía las RPC de abajo (security definer).

-- ---------------------------------------------------------------------------
-- 3. Órdenes de compra: borrador → por_aprobar → en_transito → recibida.
-- ---------------------------------------------------------------------------
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  location_id uuid references locations(id) on delete set null,
  supplier_id uuid references suppliers(id) on delete set null,
  status text not null default 'borrador' check (status in ('borrador', 'por_aprobar', 'en_transito', 'recibida')),
  notes text,
  auto_created boolean not null default false,
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  received_at timestamptz
);
create index purchase_orders_tenant_idx on purchase_orders(tenant_id, status);

create table purchase_order_lines (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  purchase_order_id uuid not null references purchase_orders(id) on delete cascade,
  supply_id uuid not null references supplies(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unit_cost numeric(14,4) not null
);
create index purchase_order_lines_po_idx on purchase_order_lines(purchase_order_id);

alter table purchase_orders enable row level security;
create policy purchase_orders_select on purchase_orders for select using (is_member(tenant_id));
create policy purchase_orders_insert on purchase_orders for insert with check (has_role(tenant_id, 'admin'));
create policy purchase_orders_update on purchase_orders for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));

alter table purchase_order_lines enable row level security;
create policy purchase_order_lines_select on purchase_order_lines for select using (is_member(tenant_id));
create policy purchase_order_lines_insert on purchase_order_lines for insert with check (has_role(tenant_id, 'admin'));

-- ---------------------------------------------------------------------------
-- 4. Transferencias entre sedes.
-- ---------------------------------------------------------------------------
create table stock_transfers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  from_supply_id uuid not null references supplies(id) on delete cascade,
  to_location_id uuid not null references locations(id) on delete cascade,
  quantity numeric(12,2) not null check (quantity > 0),
  status text not null default 'pendiente' check (status in ('pendiente', 'completada')),
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index stock_transfers_tenant_idx on stock_transfers(tenant_id, status);

alter table stock_transfers enable row level security;
create policy stock_transfers_select on stock_transfers for select using (is_member(tenant_id));
create policy stock_transfers_insert on stock_transfers for insert with check (has_role(tenant_id, 'admin'));

-- ---------------------------------------------------------------------------
-- 5. Avanzar una OC. Al llegar a "recibida": crea un lote y sube
--    quantity_purchased/total_cost/quantity_remaining de cada insumo de sus
--    líneas (el promedio ponderado sale solo, unit_cost es columna generada).
-- ---------------------------------------------------------------------------
create or replace function advance_purchase_order(p_po_id uuid, p_new_status text)
returns purchase_orders
language plpgsql
security definer
set search_path = public
as $$
declare po purchase_orders; next_ok boolean; line record;
begin
  select * into po from purchase_orders where id = p_po_id;
  if po.id is null then raise exception 'Orden de compra no encontrada'; end if;
  if not has_role(po.tenant_id, 'admin') then
    raise exception 'No tienes permiso para avanzar órdenes de compra.';
  end if;

  next_ok := (po.status = 'borrador' and p_new_status = 'por_aprobar')
    or (po.status = 'por_aprobar' and p_new_status = 'en_transito')
    or (po.status = 'en_transito' and p_new_status = 'recibida');
  if not next_ok then
    raise exception 'No se puede pasar de % a %.', po.status, p_new_status;
  end if;

  update purchase_orders set
    status = p_new_status,
    approved_at = case when p_new_status = 'por_aprobar' then now() else approved_at end,
    received_at = case when p_new_status = 'recibida' then now() else received_at end
  where id = p_po_id
  returning * into po;

  if p_new_status = 'recibida' then
    for line in select * from purchase_order_lines where purchase_order_id = p_po_id loop
      insert into supply_lots (tenant_id, supply_id, supplier_id, unit_cost, quantity_received, purchase_order_id)
      values (po.tenant_id, line.supply_id, po.supplier_id, line.unit_cost, line.quantity, po.id);

      update supplies set
        quantity_purchased = quantity_purchased + line.quantity,
        total_cost = total_cost + (line.quantity * line.unit_cost),
        quantity_remaining = quantity_remaining + line.quantity
      where id = line.supply_id;
    end loop;
  end if;

  return po;
end $$;

-- ---------------------------------------------------------------------------
-- 6. Completar una transferencia: resta del origen, busca o crea el destino
--    (mismo nombre/unidad, sede destino) y le suma.
-- ---------------------------------------------------------------------------
create or replace function complete_transfer(p_transfer_id uuid)
returns stock_transfers
language plpgsql
security definer
set search_path = public
as $$
declare t stock_transfers; src supplies; dest_id uuid;
begin
  select * into t from stock_transfers where id = p_transfer_id;
  if t.id is null then raise exception 'Transferencia no encontrada'; end if;
  if not has_role(t.tenant_id, 'admin') then
    raise exception 'No tienes permiso para completar transferencias.';
  end if;
  if t.status = 'completada' then raise exception 'Esta transferencia ya se completó.'; end if;

  select * into src from supplies where id = t.from_supply_id;
  if src.quantity_remaining < t.quantity then
    raise exception 'No hay suficiente stock en la sede de origen.';
  end if;

  update supplies set quantity_remaining = quantity_remaining - t.quantity where id = src.id;

  select id into dest_id from supplies
    where tenant_id = t.tenant_id and location_id = t.to_location_id
      and name = src.name and unit = src.unit
    limit 1;

  if dest_id is null then
    insert into supplies (tenant_id, location_id, name, unit, quantity_purchased, quantity_remaining, total_cost, low_stock_threshold)
    values (t.tenant_id, t.to_location_id, src.name, src.unit, t.quantity, t.quantity, t.quantity * src.unit_cost, src.low_stock_threshold)
    returning id into dest_id;
  else
    update supplies set
      quantity_purchased = quantity_purchased + t.quantity,
      quantity_remaining = quantity_remaining + t.quantity,
      total_cost = total_cost + (t.quantity * src.unit_cost)
    where id = dest_id;
  end if;

  update stock_transfers set status = 'completada', completed_at = now() where id = p_transfer_id
    returning * into t;
  return t;
end $$;

-- ---------------------------------------------------------------------------
-- 7. Reorden automático: al cruzar por debajo del punto de reorden
--    (low_stock_threshold) y no haber ya una OC abierta para ese insumo, crea
--    una en borrador de una sola línea.
-- ---------------------------------------------------------------------------
create or replace function supplies_check_reorder()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare existing_po_id uuid; new_po_id uuid; target_qty numeric;
begin
  if new.low_stock_threshold > 0
     and new.quantity_remaining <= new.low_stock_threshold
     and old.quantity_remaining > old.low_stock_threshold then

    select po.id into existing_po_id
      from purchase_orders po
      join purchase_order_lines pol on pol.purchase_order_id = po.id
      where pol.supply_id = new.id and po.status <> 'recibida'
      limit 1;

    if existing_po_id is null then
      insert into purchase_orders (tenant_id, location_id, status, auto_created)
      values (new.tenant_id, new.location_id, 'borrador', true)
      returning id into new_po_id;

      target_qty := greatest(new.low_stock_threshold * 2 - new.quantity_remaining, new.low_stock_threshold);
      insert into purchase_order_lines (tenant_id, purchase_order_id, supply_id, quantity, unit_cost)
      values (new.tenant_id, new_po_id, new.id, target_qty, new.unit_cost);
    end if;
  end if;
  return new;
end $$;

create trigger supplies_reorder_check after update of quantity_remaining on supplies
  for each row execute function supplies_check_reorder();
