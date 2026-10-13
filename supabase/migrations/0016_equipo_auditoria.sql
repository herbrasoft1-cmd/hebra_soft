-- =============================================================================
-- HEBRA · Equipo: "Último acceso" y "2FA" reales por miembro (Ent-Equipo.dc.html).
-- Postgres no deja cambiar las columnas de salida de una función con CREATE OR
-- REPLACE, así que hay que borrarla primero (mismo patrón que la migración 0007).
-- Ambos datos salen de auth.* real (auth.users.last_sign_in_at,
-- auth.mfa_factors.status = 'verified') — nunca un estado inventado.
-- Ejecuta en Supabase → SQL Editor después del 0015.
-- =============================================================================

drop function if exists list_members(uuid);
create function list_members(p_tenant_id uuid)
returns table(
  user_id uuid,
  email text,
  role member_role,
  joined_at timestamptz,
  location_id uuid,
  location_name text,
  last_sign_in_at timestamptz,
  two_factor_enabled boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_member(p_tenant_id) then raise exception 'No autorizado.'; end if;
  return query
    select
      m.user_id,
      u.email::text,
      m.role,
      m.created_at,
      m.location_id,
      l.name,
      u.last_sign_in_at,
      exists(select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')
    from memberships m
    join auth.users u on u.id = m.user_id
    left join locations l on l.id = m.location_id
    where m.tenant_id = p_tenant_id
    order by m.created_at asc;
end $$;
