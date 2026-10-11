-- =============================================================================
-- HEBRA · Fase 3 Enterprise: tejedora asignada, avance por pedido y disponibilidad
-- semanal. Aditiva: nada se borra ni se recrea. Ejecuta en Supabase → SQL Editor
-- después del 0009.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tejedora asignada al pedido.
-- ---------------------------------------------------------------------------
alter table orders add column assigned_to uuid references auth.users(id) on delete set null;
create index orders_assigned_to_idx on orders(assigned_to);

-- ---------------------------------------------------------------------------
-- 2. El cronómetro se puede vincular a un pedido específico (para el avance),
--    sin dejar de poder usarse "suelto" desde Recetario como hoy.
-- ---------------------------------------------------------------------------
alter table timer_sessions add column order_id uuid references orders(id) on delete set null;
create index timer_sessions_order_idx on timer_sessions(order_id);

-- log_timer_session cambia de 5 a 6 parámetros: Postgres trata eso como una
-- función distinta (sobrecarga por aridad), no como un reemplazo — hay que
-- borrar la versión de 5 parámetros primero para no dejar las dos.
drop function if exists log_timer_session(uuid, integer, timestamptz, timestamptz, text);

-- Solo suma a products.labor_seconds (el costo del Recetario) cuando la sesión
-- NO está vinculada a un pedido — si sumara también con pedido, el costo del
-- patrón se inflaría cada vez que se produce, no solo al afinar la receta.
create function log_timer_session(
  p_product_id uuid, p_seconds integer, p_started_at timestamptz, p_ended_at timestamptz,
  p_client_id text, p_order_id uuid default null
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

  insert into timer_sessions (tenant_id, product_id, user_id, seconds, started_at, ended_at, client_id, order_id)
  values (t, p_product_id, auth.uid(), p_seconds, p_started_at, p_ended_at, p_client_id, p_order_id)
  on conflict (tenant_id, client_id) do nothing;

  if found and p_order_id is null then
    update products set labor_seconds = labor_seconds + p_seconds where id = p_product_id;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Disponibilidad semanal recurrente por tejedora y día (0 = lunes .. 6 =
--    domingo). Cada quien edita la suya; Propietaria/Administración, cualquiera.
-- ---------------------------------------------------------------------------
create table availability (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  hours numeric(5,2) not null default 0 check (hours >= 0),
  unique (tenant_id, user_id, weekday)
);
create index availability_tenant_idx on availability(tenant_id);

alter table availability enable row level security;
create policy availability_select on availability for select using (is_member(tenant_id));
create policy availability_insert on availability for insert
  with check (auth.uid() = user_id or has_role(tenant_id, 'admin'));
create policy availability_update on availability for update
  using (auth.uid() = user_id or has_role(tenant_id, 'admin'))
  with check (auth.uid() = user_id or has_role(tenant_id, 'admin'));
create policy availability_delete on availability for delete
  using (auth.uid() = user_id or has_role(tenant_id, 'admin'));
