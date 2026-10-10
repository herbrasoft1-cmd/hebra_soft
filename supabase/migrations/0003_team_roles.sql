-- =============================================================================
-- HEBRA · Colaboración en equipo: invitar miembros, roles (owner/admin/staff),
-- y acceso restringido a datos financieros para "staff".
-- Ejecuta este archivo en Supabase → SQL Editor después del 0001 y 0002.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Invitaciones
-- ---------------------------------------------------------------------------
create table invitations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  email text not null,
  role member_role not null default 'staff',
  token text not null,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz
);
create unique index invitations_token_idx on invitations(token);
-- Evita invitaciones pendientes duplicadas al mismo correo; reinvitar renueva el token.
create unique index invitations_pending_email_idx on invitations(tenant_id, email) where accepted_at is null;
create index invitations_tenant_idx on invitations(tenant_id);

-- ---------------------------------------------------------------------------
-- Rol mínimo requerido (como is_member, pero exige owner/admin)
-- ---------------------------------------------------------------------------
create or replace function has_role(t uuid, min_role member_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from memberships m
    where m.tenant_id = t and m.user_id = auth.uid()
      and case min_role
            when 'owner' then m.role = 'owner'
            when 'admin' then m.role in ('owner', 'admin')
            when 'staff' then true
          end
  );
$$;

-- ---------------------------------------------------------------------------
-- Protección: nunca dejar un negocio sin ningún dueño
-- ---------------------------------------------------------------------------
create or replace function protect_last_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare owners_left integer;
begin
  if (tg_op = 'DELETE' and old.role = 'owner')
     or (tg_op = 'UPDATE' and old.role = 'owner' and new.role <> 'owner') then
    select count(*) into owners_left from memberships
      where tenant_id = old.tenant_id and role = 'owner' and user_id <> old.user_id;
    if owners_left = 0 then
      raise exception 'No puedes quitar al único dueño del negocio.';
    end if;
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;

create trigger memberships_protect_last_owner
  before update or delete on memberships for each row execute function protect_last_owner();

-- ---------------------------------------------------------------------------
-- RPCs de equipo
-- ---------------------------------------------------------------------------

create or replace function create_invitation(p_tenant_id uuid, p_email text, p_role member_role)
returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare email_norm text := lower(trim(p_email)); inv invitations;
begin
  if not has_role(p_tenant_id, 'admin') then
    raise exception 'No tienes permiso para invitar personas a este negocio.';
  end if;
  if p_role = 'owner' and not has_role(p_tenant_id, 'owner') then
    raise exception 'Solo un dueño puede invitar a otro dueño.';
  end if;
  if email_norm !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Correo inválido.';
  end if;
  if exists (
    select 1 from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id and lower(u.email) = email_norm
  ) then
    raise exception 'Esa persona ya es parte del equipo.';
  end if;

  insert into invitations (tenant_id, email, role, token, invited_by, expires_at)
  values (p_tenant_id, email_norm, p_role, encode(gen_random_bytes(24), 'hex'), auth.uid(), now() + interval '7 days')
  on conflict (tenant_id, email) where accepted_at is null
    do update set role = excluded.role, token = excluded.token, invited_by = excluded.invited_by,
                  created_at = now(), expires_at = excluded.expires_at
  returning * into inv;
  return inv;
end $$;

create or replace function accept_invitation(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare inv invitations; my_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into inv from invitations where token = p_token for update;
  if inv.id is null then raise exception 'Invitación no encontrada.'; end if;
  if inv.accepted_at is not null then raise exception 'Esta invitación ya fue usada.'; end if;
  if inv.expires_at < now() then raise exception 'Esta invitación venció.'; end if;
  if my_email = '' or my_email <> lower(inv.email) then
    raise exception 'Esta invitación es para otro correo.';
  end if;

  if exists (select 1 from memberships where tenant_id = inv.tenant_id and user_id = auth.uid()) then
    update invitations set accepted_at = now() where id = inv.id;
    return inv.tenant_id;
  end if;

  insert into memberships (tenant_id, user_id, role) values (inv.tenant_id, auth.uid(), inv.role);
  update invitations set accepted_at = now() where id = inv.id;
  return inv.tenant_id;
end $$;

create or replace function list_members(p_tenant_id uuid)
returns table(user_id uuid, email text, role member_role, joined_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_member(p_tenant_id) then raise exception 'No autorizado.'; end if;
  return query
    -- auth.users.email es varchar(255); se castea a text para que coincida con el tipo declarado.
    select m.user_id, u.email::text, m.role, m.created_at
    from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id
    order by m.created_at asc;
end $$;

create or replace function update_member_role(p_tenant_id uuid, p_user_id uuid, p_role member_role)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare target_role member_role;
begin
  if not has_role(p_tenant_id, 'admin') then
    raise exception 'No tienes permiso para cambiar roles en este negocio.';
  end if;
  select role into target_role from memberships where tenant_id = p_tenant_id and user_id = p_user_id;
  if target_role is null then raise exception 'Ese usuario no pertenece a este negocio.'; end if;
  if (target_role = 'owner' or p_role = 'owner') and not has_role(p_tenant_id, 'owner') then
    raise exception 'Solo un dueño puede otorgar o quitar el rol de dueño.';
  end if;
  update memberships set role = p_role where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;

-- También sirve como "salir del negocio" cuando p_user_id = auth.uid().
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
    if not has_role(p_tenant_id, 'admin') then
      raise exception 'No tienes permiso para quitar miembros de este negocio.';
    end if;
    if target_role = 'owner' and not has_role(p_tenant_id, 'owner') then
      raise exception 'Solo un dueño puede quitar a otro dueño.';
    end if;
  end if;
  delete from memberships where tenant_id = p_tenant_id and user_id = p_user_id;
end $$;

-- ---------------------------------------------------------------------------
-- RLS de invitations: solo admins del negocio, o el propio correo invitado
-- ---------------------------------------------------------------------------
alter table invitations enable row level security;

create policy invitations_select on invitations for select using (
  has_role(tenant_id, 'admin') or lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
);
create policy invitations_delete on invitations for delete using (has_role(tenant_id, 'admin'));
-- Sin insert/update directo: la creación es solo vía create_invitation, la aceptación vía accept_invitation.

-- ---------------------------------------------------------------------------
-- create_remission y mark_order_paid pasan a security definer: si transactions
-- queda restringida a admin+, estas dos funciones (usadas también por "staff")
-- dejarían de funcionar si siguieran dependiendo de la RLS del invocador.
-- ---------------------------------------------------------------------------
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

  insert into transactions (tenant_id, type, category, description, amount, payment_method, order_id)
  values (o.tenant_id, 'ingreso', 'Venta', o.title, o.price * o.quantity, p_payment_method, o.id);
end $$;

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

  update tenants set remission_seq = remission_seq + 1
    where id = o.tenant_id
    returning remission_seq into n;

  insert into remissions (tenant_id, order_id, number, payment_method, total)
  values (o.tenant_id, o.id, n, p_payment_method, o.price * o.quantity)
  returning * into r;
  return r;
end $$;

-- ---------------------------------------------------------------------------
-- Restringir datos financieros a admin+: "staff" no ve Caja ni puede cambiar
-- la configuración del negocio (hourly_rate, etc.). tenants_select NO se toca:
-- Recetario necesita leer hourly_rate para costear, y eso lo usa también staff.
-- ---------------------------------------------------------------------------
drop policy if exists transactions_select on transactions;
drop policy if exists transactions_insert on transactions;
drop policy if exists transactions_update on transactions;
drop policy if exists transactions_delete on transactions;
create policy transactions_select on transactions for select using (has_role(tenant_id, 'admin'));
create policy transactions_insert on transactions for insert with check (has_role(tenant_id, 'admin'));
create policy transactions_update on transactions for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));
create policy transactions_delete on transactions for delete using (has_role(tenant_id, 'admin'));

drop policy if exists tenants_update on tenants;
create policy tenants_update on tenants for update using (has_role(id, 'admin')) with check (has_role(id, 'admin'));
