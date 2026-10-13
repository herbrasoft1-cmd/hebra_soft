-- =============================================================================
-- HEBRA · Foto de perfil por persona (no por negocio — eso ya existe como
-- tenants.logo_url). Se guarda en auth.users.raw_user_meta_data.avatar_url,
-- mismo lugar que full_name, así que no hace falta ninguna tabla nueva.
-- list_members se extiende para exponerla a cualquier lugar que hoy muestra
-- el círculo de iniciales de otra persona del equipo (no solo la propia cuenta).
-- Postgres no deja cambiar las columnas de salida de una función con CREATE OR
-- REPLACE, así que hay que borrarla primero (mismo patrón que 0007/0016).
-- Ejecuta en Supabase → SQL Editor después del 0016.
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
  two_factor_enabled boolean,
  avatar_url text
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
      exists(select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified'),
      u.raw_user_meta_data->>'avatar_url'
    from memberships m
    join auth.users u on u.id = m.user_id
    left join locations l on l.id = m.location_id
    where m.tenant_id = p_tenant_id
    order by m.created_at asc;
end $$;

-- auth.updateUser() actualiza la fila de auth.users, pero el access token de la sesión actual
-- sigue llevando los datos viejos como claims hasta que se refresque solo (no antes) — así que
-- getUser() (usado en (app)/layout.tsx para el nombre/foto propios) puede devolver un nombre o
-- foto desatualizados justo después de guardarlos. La solución NO es forzar un refresh de sesión
-- desde el servidor (eso rota el refresh token y puede desincronizar al cliente del navegador,
-- que lleva su propio ciclo de refresh en paralelo — probado y descartado por ese riesgo real).
-- En su lugar, se lee el propio perfil con una consulta directa, igual que list_members ya hace
-- para el resto del equipo: siempre fresca, sin tocar el ciclo de vida del token.
create or replace function get_my_profile()
returns table(full_name text, avatar_url text)
language sql
stable
security definer
set search_path = public
as $$
  select raw_user_meta_data->>'full_name', raw_user_meta_data->>'avatar_url'
  from auth.users where id = auth.uid();
$$;

-- Storage para la foto (mismo patrón exacto de los buckets `logos`/`avance`), pero el
-- dueño del archivo es la propia persona, no un tenant: la carpeta raíz es el user_id,
-- validada contra auth.uid() en vez de is_member(tenant_id).
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

-- Los archivos se guardan como avatars/<user_id>/avatar.jpg|png
create policy avatars_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
create policy avatars_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and auth.uid() = ((storage.foldername(name))[1])::uuid);
create policy avatars_read on storage.objects for select
  using (bucket_id = 'avatars');
