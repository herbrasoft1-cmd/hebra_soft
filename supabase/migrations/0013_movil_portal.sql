-- =============================================================================
-- HEBRA · Fase 8 Enterprise: "Mi turno" (pasos del patrón marcables), detalle
-- de pedido móvil con saldo real (sin pasarela de pago), y portal público de
-- seguimiento por token (sin sesión). Aditiva: nada se borra ni se recrea.
--
-- "Saldo" se calcula de verdad sumando transactions.amount (ingreso) ligadas
-- al pedido — no se crea una tabla `payments` nueva (eso es Fase 6, excluida).
-- El token de seguimiento se genera con gen_random_uuid(), no gen_random_bytes:
-- pgcrypto no está en el search_path de las funciones security definer de este
-- proyecto (ya documentado en memoria de sesiones anteriores).
-- Ejecuta en Supabase → SQL Editor después del 0012.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pasos del patrón (Recetario) y su marcado por pedido ("Mi turno").
-- ---------------------------------------------------------------------------
create table product_steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  position int not null default 0,
  name text not null,
  detail text,
  created_at timestamptz not null default now()
);
create index product_steps_product_idx on product_steps(product_id, position);

alter table product_steps enable row level security;
create policy product_steps_select on product_steps for select using (is_member(tenant_id));
create policy product_steps_insert on product_steps for insert with check (has_role(tenant_id, 'admin'));
create policy product_steps_update on product_steps for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));
create policy product_steps_delete on product_steps for delete using (has_role(tenant_id, 'admin'));

-- Marcado por pedido (el mismo patrón, tildado distinto en cada turno/pedido).
-- Sin insert/update/delete directo: solo vía toggle_order_step (abajo).
create table order_step_progress (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  step_id uuid not null references product_steps(id) on delete cascade,
  done_at timestamptz not null default now(),
  unique (order_id, step_id)
);

alter table order_step_progress enable row level security;
create policy order_step_progress_select on order_step_progress for select using (is_member(tenant_id));

create or replace function toggle_order_step(p_order_id uuid, p_step_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare o orders; existing uuid;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null or not is_member(o.tenant_id) then raise exception 'Pedido no encontrado'; end if;
  if not (has_role(o.tenant_id, 'admin') or o.assigned_to = auth.uid()) then
    raise exception 'No tienes permiso para marcar los pasos de este pedido.';
  end if;

  select id into existing from order_step_progress where order_id = p_order_id and step_id = p_step_id;
  if existing is null then
    insert into order_step_progress (tenant_id, order_id, step_id) values (o.tenant_id, p_order_id, p_step_id);
    return true;
  else
    delete from order_step_progress where id = existing;
    return false;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Seguimiento público del pedido (token aleatorio) y foto de avance.
-- ---------------------------------------------------------------------------
alter table orders add column tracking_token text unique default replace(gen_random_uuid()::text, '-', '');
alter table orders add column progress_photo_url text;

-- Red de seguridad: el default ya backfillea las filas existentes (función
-- volátil => Postgres recalcula por fila al agregar la columna), pero por las
-- dudas se asegura explícitamente que ninguna quede nula.
update orders set tracking_token = replace(gen_random_uuid()::text, '-', '') where tracking_token is null;

-- get_order_tracking: autoriza por posesión del token, no por sesión (igual
-- que accept_invitation). Proyecta solo los campos mínimos del mockup del
-- portal — nunca select *.
create or replace function get_order_tracking(p_token text)
returns table (
  order_id uuid,
  title text,
  product_name text,
  status order_status,
  due_date date,
  customer_first_name text,
  total numeric,
  paid boolean,
  balance numeric,
  progress_photo_url text,
  tenant_name text,
  tenant_logo_url text,
  tenant_whatsapp text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.title, p.name, o.status, o.due_date,
    split_part(coalesce(c.name, ''), ' ', 1),
    o.price * o.quantity, o.paid,
    greatest(o.price * o.quantity - coalesce((
      select sum(tx.amount) from transactions tx where tx.order_id = o.id and tx.type = 'ingreso'
    ), 0), 0),
    o.progress_photo_url, t.name, t.logo_url, t.whatsapp
  from orders o
  left join products p on p.id = o.product_id
  left join customers c on c.id = o.customer_id
  left join tenants t on t.id = o.tenant_id
  where o.tracking_token = p_token;
$$;

-- ---------------------------------------------------------------------------
-- 3. Saldo real de un pedido (para el detalle móvil, con sesión) y registro
--    de abonos — reutiliza transactions.order_id, no crea una tabla `payments`.
-- ---------------------------------------------------------------------------
create or replace function get_order_balance(p_order_id uuid)
returns numeric
language sql
stable
security definer
set search_path = public
as $$
  select greatest(o.price * o.quantity - coalesce((
    select sum(tx.amount) from transactions tx where tx.order_id = o.id and tx.type = 'ingreso'
  ), 0), 0)
  from orders o
  where o.id = p_order_id and is_member(o.tenant_id);
$$;

create or replace function register_order_payment(p_order_id uuid, p_amount numeric, p_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null or not is_member(o.tenant_id) then raise exception 'Pedido no encontrado'; end if;
  if p_amount <= 0 then raise exception 'El monto debe ser mayor a cero.'; end if;

  insert into transactions (tenant_id, type, category, description, amount, payment_method, order_id, location_id)
  values (o.tenant_id, 'ingreso', 'Abono', o.title, p_amount, p_method, o.id, o.location_id);
end $$;

-- ---------------------------------------------------------------------------
-- 4. Storage para la foto de avance (mismo patrón exacto que el bucket
--    `logos`: público de solo lectura, escritura por tenant).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avance', 'avance', true)
on conflict (id) do nothing;

-- Los archivos se guardan como avance/<tenant_id>/<order_id>.jpg
create policy avance_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avance' and is_member(((storage.foldername(name))[1])::uuid));
create policy avance_update on storage.objects for update to authenticated
  using (bucket_id = 'avance' and is_member(((storage.foldername(name))[1])::uuid));
create policy avance_read on storage.objects for select
  using (bucket_id = 'avance');
