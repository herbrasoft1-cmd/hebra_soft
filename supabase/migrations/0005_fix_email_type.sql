-- =============================================================================
-- HEBRA · Corrige un bug real: auth.users.email es varchar(255) en Postgres,
-- pero list_members y list_audit_log declaran su columna de salida como text.
-- Postgres no hace ese cast implícito en una función con "returns table", así
-- que ambas fallaban con "structure of query does not match function result
-- type" — nunca se vio en el código (TypeScript no lo detecta), solo
-- navegando la app real: la sección "Equipo" se veía vacía sin ningún error
-- visible porque el error de Supabase no se estaba revisando en page.tsx.
-- Ejecuta este archivo en Supabase → SQL Editor después del 0004.
-- =============================================================================

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
    select m.user_id, u.email::text, m.role, m.created_at
    from memberships m join auth.users u on u.id = m.user_id
    where m.tenant_id = p_tenant_id
    order by m.created_at asc;
end $$;

create or replace function list_audit_log(p_tenant_id uuid, p_limit integer default 50)
returns table(id uuid, email text, action text, entity_type text, entity_id uuid, metadata jsonb, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not has_role(p_tenant_id, 'admin') then raise exception 'No autorizado.'; end if;
  return query
    select a.id, u.email::text, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at
    from audit_log a left join auth.users u on u.id = a.user_id
    where a.tenant_id = p_tenant_id
    order by a.created_at desc
    limit p_limit;
end $$;
