-- =============================================================================
-- HEBRA · Fase 1 Enterprise (parte 2): backfill de 'staff' → 'tejedora' y ajustes
-- de permisos. Va en archivo separado del 0006 porque Postgres no permite usar
-- un valor nuevo de enum (ADD VALUE) en la misma transacción donde se agregó —
-- el SQL Editor corre todo el pegado como una sola transacción, así que esto no
-- puede ir junto con el ALTER TYPE del 0006. Ejecuta 0006 primero, confirma que
-- terminó, y luego este.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Backfill de rol: todo lo que hoy es 'staff' pasa a 'tejedora'.
--    'staff' se queda en el enum (Postgres no permite quitar valores) pero
--    ningún código nuevo lo vuelve a usar. Toca: memberships e invitations.
-- ---------------------------------------------------------------------------
update memberships set role = 'tejedora' where role = 'staff';
update invitations set role = 'tejedora' where role = 'staff';

-- ---------------------------------------------------------------------------
-- 2. Gestionar equipo pasa a ser solo de la Propietaria (antes admin también
--    podía). Esto corrige el código del commit anterior contra la matriz real
--    del mockup Ent-Equipo.dc.html ("Gestionar equipo y permisos": solo owner).
-- ---------------------------------------------------------------------------
create or replace function create_invitation(
  p_tenant_id uuid, p_email text, p_role member_role, p_location_id uuid default null
)
returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare email_norm text := lower(trim(p_email)); inv invitations;
begin
  if not has_role(p_tenant_id, 'owner') then
    raise exception 'Solo la propietaria puede invitar personas a este negocio.';
  end if;
  if p_role = 'owner' then
    raise exception 'No se puede invitar a alguien como propietaria.';
  end if;
  if email_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo inválido.';
  end if;
  if p_location_id is not null and not exists (
    select 1 from locations where id = p_location_id and tenant_id = p_tenant_id
  ) then
    raise exception 'Esa sede no existe en este negocio.';
  end if;
  if exists (
    select 1 from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id and lower(u.email) = email_norm
  ) then
    raise exception 'Esa persona ya es parte del equipo.';
  end if;

  insert into invitations (tenant_id, email, role, location_id, token, invited_by, expires_at)
  values (p_tenant_id, email_norm, p_role, p_location_id, encode(gen_random_bytes(24), 'hex'), auth.uid(), now() + interval '7 days')
  on conflict (tenant_id, email) where accepted_at is null
    do update set role = excluded.role, location_id = excluded.location_id, token = excluded.token,
                  invited_by = excluded.invited_by, created_at = now(), expires_at = excluded.expires_at
  returning * into inv;
  return inv;
end $$;

create or replace function update_member_role(p_tenant_id uuid, p_user_id uuid, p_role member_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_role member_role;
begin
  if not has_role(p_tenant_id, 'owner') then
    raise exception 'Solo la propietaria puede cambiar roles en este negocio.';
  end if;
  select role into target_role from memberships where tenant_id = p_tenant_id and user_id = p_user_id;
  if target_role is null then raise exception 'Ese usuario no pertenece a este negocio.'; end if;
  if target_role = 'owner' or p_role = 'owner' then
    raise exception 'El rol de propietaria no se otorga ni se quita desde aquí.';
  end if;
  update memberships set role = p_role where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;

-- También sirve como "salir del negocio" cuando p_user_id = auth.uid() (eso no exige ser owner).
create or replace function remove_member(p_tenant_id uuid, p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_role member_role;
begin
  select role into target_role from memberships where tenant_id = p_tenant_id and user_id = p_user_id;
  if target_role is null then raise exception 'Ese usuario no pertenece a este negocio.'; end if;
  if p_user_id <> auth.uid() then
    if not has_role(p_tenant_id, 'owner') then
      raise exception 'Solo la propietaria puede quitar miembros de este negocio.';
    end if;
    if target_role = 'owner' then
      raise exception 'El rol de propietaria no se quita desde aquí.';
    end if;
  end if;
  delete from memberships where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;

-- list_members ahora también devuelve la sede (nombre; null = "Todas"). Postgres no deja
-- cambiar las columnas de salida de una función con CREATE OR REPLACE, así que hay que
-- borrarla primero.
drop function if exists list_members(uuid);
create function list_members(p_tenant_id uuid)
returns table(user_id uuid, email text, role member_role, joined_at timestamptz, location_id uuid, location_name text)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_member(p_tenant_id) then raise exception 'No autorizado.'; end if;
  return query
    select m.user_id, u.email::text, m.role, m.created_at, m.location_id, l.name
    from memberships m
    join auth.users u on u.id = m.user_id
    left join locations l on l.id = m.location_id
    where m.tenant_id = p_tenant_id
    order by m.created_at asc;
end $$;

-- mark_order_paid: la transacción de ingreso que genera hereda la sede del pedido.
create or replace function mark_order_paid(p_order_id uuid, p_payment_method text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null or not is_member(o.tenant_id) then raise exception 'Pedido no encontrado'; end if;
  if o.paid then return; end if;

  update orders set paid = true where id = o.id;

  insert into transactions (tenant_id, type, category, description, amount, payment_method, order_id, location_id)
  values (o.tenant_id, 'ingreso', 'Venta', o.title, o.price * o.quantity, p_payment_method, o.id, o.location_id);
end $$;

-- ---------------------------------------------------------------------------
-- 3. Remisiones/facturas: solo owner, admin o ventas pueden emitirlas
--    ("Emitir facturas y remisiones" en la matriz de roles). Defensa en
--    profundidad: la UI ya va a ocultar el botón para quien no puede.
-- ---------------------------------------------------------------------------
create or replace function create_remission(p_order_id uuid, p_payment_method text)
returns remissions
language plpgsql
security definer
set search_path = public
as $$
declare
  o orders;
  n integer;
  r remissions;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null or not is_member(o.tenant_id) then raise exception 'Pedido no encontrado'; end if;
  if not exists (
    select 1 from memberships
    where tenant_id = o.tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas')
  ) then
    raise exception 'No tienes permiso para emitir remisiones.';
  end if;

  update tenants set remission_seq = remission_seq + 1
    where id = o.tenant_id
    returning remission_seq into n;

  insert into remissions (tenant_id, order_id, number, payment_method, total)
  values (o.tenant_id, o.id, n, p_payment_method, o.price * o.quantity)
  returning * into r;
  return r;
end $$;
