-- =============================================================================
-- HEBRA · Esquema multitenant (base de datos única, esquema compartido)
-- Cada tabla de negocio lleva tenant_id y está protegida con Row Level Security:
-- un usuario solo ve y modifica filas de los negocios (tenants) a los que pertenece.
-- Ejecuta este archivo en Supabase → SQL Editor (o con `supabase db push`).
-- =============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------------
create type unit_type as enum ('g', 'm', 'u', 'ml');
create type order_status as enum ('espera', 'proceso', 'calidad', 'enviado');
create type transaction_type as enum ('ingreso', 'gasto');
create type member_role as enum ('owner', 'admin', 'staff');

-- ---------------------------------------------------------------------------
-- Tenants (cada negocio registrado)
-- ---------------------------------------------------------------------------
create table tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  -- Módulo de especialización (core genérico + plugin). Hoy: 'crochet'.
  industry text not null default 'crochet',
  hourly_rate numeric(12,2) not null default 12000,      -- valor de la hora (COP)
  tool_wear_pct numeric(5,2) not null default 5,         -- % desgaste de herramientas
  currency text not null default 'COP',
  logo_url text,
  whatsapp text,
  instagram text,
  remission_seq integer not null default 0,              -- consecutivo de remisiones
  created_at timestamptz not null default now()
);

create table memberships (
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role member_role not null default 'owner',
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index memberships_user_idx on memberships(user_id);

-- Función auxiliar: ¿el usuario actual pertenece a este tenant?
-- security definer evita recursión de RLS sobre memberships.
create or replace function is_member(t uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.tenant_id = t and m.user_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- A. Insumos (materia prima)
-- ---------------------------------------------------------------------------
create table supplies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  brand text,
  lot_color text,
  unit unit_type not null default 'g',
  quantity_purchased numeric(12,2) not null check (quantity_purchased > 0),
  quantity_remaining numeric(12,2) not null default 0,
  total_cost numeric(12,2) not null check (total_cost >= 0),
  -- Costo por unidad mínima: si 100 g cuestan $15.000, 1 g = $150
  unit_cost numeric(14,4) generated always as (total_cost / quantity_purchased) stored,
  low_stock_threshold numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index supplies_tenant_idx on supplies(tenant_id);

-- ---------------------------------------------------------------------------
-- B. Recetario (producto base / patrón)
-- ---------------------------------------------------------------------------
create table products (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  category text,
  notes text,
  labor_seconds integer not null default 0,     -- tiempo real medido con el cronómetro
  target_margin_pct numeric(6,2) not null default 50,
  sale_price numeric(12,2),                     -- precio elegido por el usuario
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_tenant_idx on products(tenant_id);

create table product_supplies (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  supply_id uuid not null references supplies(id) on delete restrict,
  quantity numeric(12,2) not null check (quantity > 0),
  unique (product_id, supply_id)
);
create index product_supplies_product_idx on product_supplies(product_id);

create table timer_sessions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  seconds integer not null check (seconds > 0),
  started_at timestamptz not null,
  ended_at timestamptz not null,
  -- id generado en el dispositivo: evita duplicados al sincronizar desde modo offline
  client_id text,
  unique (tenant_id, client_id)
);

-- ---------------------------------------------------------------------------
-- C. Pedidos y CRM
-- ---------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  whatsapp text,
  instagram text,
  address text,
  created_at timestamptz not null default now()
);
create index customers_tenant_idx on customers(tenant_id);

create table orders (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  product_id uuid references products(id) on delete set null,
  title text not null,
  details text,
  quantity integer not null default 1 check (quantity > 0),
  price numeric(12,2) not null default 0,
  status order_status not null default 'espera',
  due_date date,
  paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index orders_tenant_status_idx on orders(tenant_id, status);

-- ---------------------------------------------------------------------------
-- D. Caja chica y remisiones
-- ---------------------------------------------------------------------------
create table transactions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type transaction_type not null,
  category text not null,
  description text,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text,
  order_id uuid references orders(id) on delete set null,
  occurred_on date not null default current_date,
  created_at timestamptz not null default now()
);
create index transactions_tenant_date_idx on transactions(tenant_id, occurred_on desc);

create table remissions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  number integer not null,
  payment_method text,
  total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  unique (tenant_id, number)
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger supplies_touch before update on supplies for each row execute function touch_updated_at();
create trigger products_touch before update on products for each row execute function touch_updated_at();
create trigger orders_touch before update on orders for each row execute function touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security: aislamiento total por tenant_id
-- ---------------------------------------------------------------------------
alter table tenants enable row level security;
alter table memberships enable row level security;
alter table supplies enable row level security;
alter table products enable row level security;
alter table product_supplies enable row level security;
alter table timer_sessions enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table transactions enable row level security;
alter table remissions enable row level security;

create policy tenants_select on tenants for select using (is_member(id));
create policy tenants_update on tenants for update using (is_member(id)) with check (is_member(id));

create policy memberships_select on memberships for select using (user_id = auth.uid() or is_member(tenant_id));

-- Mismo patrón para todas las tablas de negocio
do $$
declare t text;
begin
  foreach t in array array[
    'supplies','products','product_supplies','timer_sessions',
    'customers','orders','transactions','remissions'
  ] loop
    execute format('create policy %1$s_select on %1$s for select using (is_member(tenant_id))', t);
    execute format('create policy %1$s_insert on %1$s for insert with check (is_member(tenant_id))', t);
    execute format('create policy %1$s_update on %1$s for update using (is_member(tenant_id)) with check (is_member(tenant_id))', t);
    execute format('create policy %1$s_delete on %1$s for delete using (is_member(tenant_id))', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- RPCs
-- ---------------------------------------------------------------------------

-- Crea el negocio del usuario recién registrado y lo deja como dueño.
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
  return new_id;
end $$;

-- Guarda una sesión del cronómetro y suma el tiempo al producto (idempotente por client_id).
create or replace function log_timer_session(
  p_product_id uuid, p_seconds integer, p_started_at timestamptz, p_ended_at timestamptz, p_client_id text
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare t uuid;
begin
  select tenant_id into t from products where id = p_product_id;
  if t is null then raise exception 'Producto no encontrado'; end if;

  insert into timer_sessions (tenant_id, product_id, user_id, seconds, started_at, ended_at, client_id)
  values (t, p_product_id, auth.uid(), p_seconds, p_started_at, p_ended_at, p_client_id)
  on conflict (tenant_id, client_id) do nothing;

  if found then
    update products set labor_seconds = labor_seconds + p_seconds where id = p_product_id;
  end if;
end $$;

-- Reserva el siguiente consecutivo de remisión del negocio y la registra.
create or replace function create_remission(p_order_id uuid, p_payment_method text)
returns remissions
language plpgsql
security invoker
set search_path = public
as $$
declare
  o orders;
  n integer;
  r remissions;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null then raise exception 'Pedido no encontrado'; end if;

  update tenants set remission_seq = remission_seq + 1
    where id = o.tenant_id
    returning remission_seq into n;

  insert into remissions (tenant_id, order_id, number, payment_method, total)
  values (o.tenant_id, o.id, n, p_payment_method, o.price * o.quantity)
  returning * into r;
  return r;
end $$;

-- Al marcar un pedido como enviado se descuentan los insumos de su receta.
create or replace function consume_order_supplies()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if new.status = 'enviado' and old.status <> 'enviado' and new.product_id is not null then
    update supplies s
       set quantity_remaining = greatest(0, s.quantity_remaining - ps.quantity * new.quantity)
      from product_supplies ps
     where ps.product_id = new.product_id
       and ps.supply_id = s.id
       and s.tenant_id = new.tenant_id;
  end if;
  return new;
end $$;

create trigger orders_consume after update of status on orders
  for each row execute function consume_order_supplies();

-- ---------------------------------------------------------------------------
-- Storage para logos (bucket público de solo lectura; escritura por tenant)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

-- Los archivos se guardan como logos/<tenant_id>/logo.png
create policy logos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'logos' and is_member(((storage.foldername(name))[1])::uuid));
create policy logos_update on storage.objects for update to authenticated
  using (bucket_id = 'logos' and is_member(((storage.foldername(name))[1])::uuid));
create policy logos_read on storage.objects for select
  using (bucket_id = 'logos');
