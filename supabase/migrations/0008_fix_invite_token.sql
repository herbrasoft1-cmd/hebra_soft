-- =============================================================================
-- HEBRA · Arregla create_invitation: usaba gen_random_bytes() (de la extensión
-- pgcrypto), que no está disponible dentro del search_path restringido a
-- "public" de esta función security definer — el error solo aparece al crear
-- una invitación de verdad, no al aplicar la migración, por eso no se vio antes.
-- Se reemplaza por gen_random_uuid(), nativo de Postgres (ya usado en el resto
-- del proyecto para los id de las tablas), sin depender de ninguna extensión.
-- No toca datos existentes, solo la función.
-- =============================================================================

create or replace function create_invitation(
  p_tenant_id uuid, p_email text, p_role member_role, p_location_id uuid default null
)
returns invitations
language plpgsql
security definer
set search_path = public
as $$
declare email_norm text := lower(trim(p_email)); inv invitations; new_token text;
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

  insert into invitations (tenant_id, email, role, location_id, token, invited_by, expires_at)
  values (p_tenant_id, email_norm, p_role, p_location_id, new_token, auth.uid(), now() + interval '7 days')
  on conflict (tenant_id, email) where accepted_at is null
    do update set role = excluded.role, location_id = excluded.location_id, token = excluded.token,
                  invited_by = excluded.invited_by, created_at = now(), expires_at = excluded.expires_at
  returning * into inv;
  return inv;
end $$;
