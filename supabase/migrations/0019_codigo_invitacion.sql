-- =============================================================================
-- HEBRA · Código corto de invitación: además del link con token largo, se puede
-- compartir un código corto (8 caracteres) para escribirlo a mano en /invitar.
-- Ejecuta este archivo en Supabase → SQL Editor después del 0018.
-- =============================================================================

alter table invitations add column if not exists code text;

-- Backfill: las invitaciones ya existentes (pendientes o no) también reciben un código,
-- para que ninguna fila quede con code null. gen_random_uuid() es nativo de Postgres
-- (no gen_random_bytes/pgcrypto: no está disponible en el search_path restringido de
-- las funciones security definer de este proyecto — ver 0008_fix_invite_token.sql).
update invitations set code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where code is null;

alter table invitations alter column code set not null;
create unique index if not exists invitations_code_idx on invitations(code);

-- create_invitation: misma lógica que 0008_fix_invite_token.sql, solo agrega la
-- generación del código corto. create or replace alcanza (devuelve el tipo de fila
-- completo, "returns invitations", no una lista de columnas).
create or replace function create_invitation(
  p_tenant_id uuid, p_email text, p_role member_role, p_location_id uuid default null
)
returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare email_norm text := lower(trim(p_email)); inv invitations; new_token text; new_code text;
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

  new_token := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into invitations (tenant_id, email, role, location_id, token, code, invited_by, expires_at)
  values (p_tenant_id, email_norm, p_role, p_location_id, new_token, new_code, auth.uid(), now() + interval '7 days')
  on conflict (tenant_id, email) where accepted_at is null
    do update set role = excluded.role, location_id = excluded.location_id, token = excluded.token,
                  code = excluded.code, invited_by = excluded.invited_by, created_at = now(),
                  expires_at = excluded.expires_at
  returning * into inv;
  return inv;
end $$;

-- Resuelve un código corto al token del link existente. Pública (no requiere sesión):
-- misma superficie de exposición que ya tiene el token en la URL del link, y la
-- aceptación real sigue exigiendo que el correo de quien acepta coincida (accept_invitation).
create or replace function get_invitation_by_code(p_code text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_token text; v_code_norm text := upper(regexp_replace(coalesce(p_code, ''), '[^a-zA-Z0-9]', '', 'g'));
begin
  if v_code_norm = '' then return null; end if;
  select token into v_token from invitations
  where code = v_code_norm and accepted_at is null and expires_at > now();
  return v_token;
end $$;
