-- =============================================================================
-- HEBRA · Registro de auditoría: quién hizo qué y cuándo, para los cambios de
-- mayor impacto (equipo, configuración del negocio, eliminaciones).
-- Ejecuta este archivo en Supabase → SQL Editor después del 0003.
-- =============================================================================

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_log_tenant_idx on audit_log(tenant_id, created_at desc);

alter table audit_log enable row level security;

-- Solo lectura para admin+; la escritura va siempre por el RPC log_audit (security definer),
-- así no hace falta una política de insert (nadie necesita insertar directo desde el cliente).
create policy audit_log_select on audit_log for select using (has_role(tenant_id, 'admin'));

create or replace function log_audit(
  p_tenant_id uuid, p_action text, p_entity_type text, p_entity_id uuid default null, p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_member(p_tenant_id) then raise exception 'No autorizado.'; end if;
  insert into audit_log (tenant_id, user_id, action, entity_type, entity_id, metadata)
  values (p_tenant_id, auth.uid(), p_action, p_entity_type, p_entity_id, coalesce(p_metadata, '{}'::jsonb));
end $$;

-- Expone el correo de quién hizo cada cambio (auth.users no es accesible directo por PostgREST).
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
    -- auth.users.email es varchar(255); se castea a text para que coincida con el tipo declarado.
    select a.id, u.email::text, a.action, a.entity_type, a.entity_id, a.metadata, a.created_at
    from audit_log a left join auth.users u on u.id = a.user_id
    where a.tenant_id = p_tenant_id
    order by a.created_at desc
    limit p_limit;
end $$;
