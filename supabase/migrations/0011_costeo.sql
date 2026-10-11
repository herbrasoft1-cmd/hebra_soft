-- =============================================================================
-- HEBRA · Fase 4 Enterprise: canales de venta configurables, versiones de
-- receta/precio, y el simulador. Aditiva: nada se borra ni se recrea. Ejecuta
-- en Supabase → SQL Editor después del 0010.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Canales de venta (reemplaza la lista fija que usaba el formulario de
--    pedido desde la Fase 2 — orders.channel sigue siendo texto libre, no se
--    toca, solo cambia de dónde salen las opciones del selector).
-- ---------------------------------------------------------------------------
create table sales_channels (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  commission_pct numeric(5,2) not null default 0,
  fixed_fee numeric(12,2) not null default 0,
  created_at timestamptz not null default now()
);
create index sales_channels_tenant_idx on sales_channels(tenant_id);

alter table sales_channels enable row level security;
create policy sales_channels_select on sales_channels for select using (is_member(tenant_id));
create policy sales_channels_insert on sales_channels for insert with check (has_role(tenant_id, 'admin'));
create policy sales_channels_update on sales_channels for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));
create policy sales_channels_delete on sales_channels for delete using (has_role(tenant_id, 'admin'));

-- Backfill: los mismos 4 canales de ejemplo del mockup Ent-Costeo.dc.html, para
-- cada tenant que ya existe (negocios nuevos los reciben vía create_tenant() más abajo).
insert into sales_channels (tenant_id, name, commission_pct, fixed_fee)
select id, 'Directo / WhatsApp', 0, 0 from tenants
union all
select id, 'Instagram Shopping', 5, 0 from tenants
union all
select id, 'Tienda online', 3.49, 900 from tenants
union all
select id, 'Marketplace', 15, 0 from tenants;

-- ---------------------------------------------------------------------------
-- 2. Versiones de receta/precio: cada "Publicar precio" crea una fila.
-- ---------------------------------------------------------------------------
create table product_versions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  version_number integer not null,
  materials_cost numeric(12,2) not null,
  labor_cost numeric(12,2) not null,
  wear_cost numeric(12,2) not null,
  hourly_rate numeric(12,2) not null,
  labor_seconds integer not null,
  channel_name text,
  commission_pct numeric(5,2) not null default 0,
  fixed_fee numeric(12,2) not null default 0,
  margin_pct numeric(5,2) not null,
  iva_included boolean not null default false,
  net_price numeric(12,2) not null,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  unique (product_id, version_number)
);
create index product_versions_product_idx on product_versions(product_id, version_number desc);

alter table product_versions enable row level security;
create policy product_versions_select on product_versions for select using (is_member(tenant_id));
-- Sin políticas de insert/update/delete: solo se crean vía publish_product_version (security definer).

create or replace function publish_product_version(
  p_product_id uuid, p_materials_cost numeric, p_labor_cost numeric, p_wear_cost numeric,
  p_hourly_rate numeric, p_labor_seconds integer, p_channel_name text, p_commission_pct numeric,
  p_fixed_fee numeric, p_margin_pct numeric, p_iva_included boolean, p_net_price numeric
)
returns product_versions
language plpgsql
security definer
set search_path = public
as $$
declare t uuid; next_version integer; v product_versions;
begin
  select tenant_id into t from products where id = p_product_id;
  if t is null then raise exception 'Patrón no encontrado'; end if;
  if not has_role(t, 'admin') then raise exception 'No tienes permiso para publicar un precio.'; end if;

  select coalesce(max(version_number), 0) + 1 into next_version
    from product_versions where product_id = p_product_id;

  insert into product_versions (
    tenant_id, product_id, version_number, materials_cost, labor_cost, wear_cost, hourly_rate,
    labor_seconds, channel_name, commission_pct, fixed_fee, margin_pct, iva_included, net_price, created_by
  ) values (
    t, p_product_id, next_version, p_materials_cost, p_labor_cost, p_wear_cost, p_hourly_rate,
    p_labor_seconds, p_channel_name, p_commission_pct, p_fixed_fee, p_margin_pct, p_iva_included, p_net_price, auth.uid()
  ) returning * into v;

  update products set sale_price = p_net_price, target_margin_pct = p_margin_pct, labor_seconds = p_labor_seconds
    where id = p_product_id;

  return v;
end $$;

-- ---------------------------------------------------------------------------
-- 3. create_tenant(): de paso, corrige que los negocios nuevos no recibían
--    sede "Principal" (gap real de la Fase 1 — solo se backfilleó para los
--    tenants que ya existían en ese momento) y siembra los mismos 4 canales.
-- ---------------------------------------------------------------------------
create or replace function create_tenant(p_name text, p_industry text default 'crochet')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'No autenticado';
  end if;
  insert into tenants (name, industry) values (p_name, coalesce(p_industry, 'crochet'))
    returning id into new_id;
  insert into memberships (tenant_id, user_id, role) values (new_id, auth.uid(), 'owner');

  insert into locations (tenant_id, name) values (new_id, 'Principal');

  insert into sales_channels (tenant_id, name, commission_pct, fixed_fee) values
    (new_id, 'Directo / WhatsApp', 0, 0),
    (new_id, 'Instagram Shopping', 5, 0),
    (new_id, 'Tienda online', 3.49, 900),
    (new_id, 'Marketplace', 15, 0);

  return new_id;
end $$;
