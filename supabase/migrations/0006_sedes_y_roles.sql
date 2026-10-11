-- =============================================================================
-- HEBRA · Fase 1 Enterprise: sedes y modelo de 4 roles (owner/admin/ventas/tejedora).
-- Aditiva: nada se borra ni se recrea. Ejecuta este archivo en Supabase → SQL Editor
-- después del 0005. Lee el comentario de cada bloque antes de correrlo: dice exactamente
-- qué filas toca el backfill.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Sedes (locations)
-- ---------------------------------------------------------------------------
create table locations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
create index locations_tenant_idx on locations(tenant_id);

alter table locations enable row level security;
create policy locations_select on locations for select using (is_member(tenant_id));
create policy locations_insert on locations for insert with check (has_role(tenant_id, 'admin'));
create policy locations_update on locations for update using (has_role(tenant_id, 'admin')) with check (has_role(tenant_id, 'admin'));
create policy locations_delete on locations for delete using (has_role(tenant_id, 'admin'));

-- Backfill: una sede "Principal" para cada tenant que ya existe, para que las columnas
-- location_id que se agregan abajo tengan algo válido a qué apuntar.
insert into locations (tenant_id, name)
select id, 'Principal' from tenants;

-- ---------------------------------------------------------------------------
-- 2. location_id en las tablas operativas (nullable: null = sin sede asignada /
--    "todas" en memberships e invitations; en supplies/orders/transactions/
--    timer_sessions se deja apuntando siempre a una sede real tras el backfill).
-- ---------------------------------------------------------------------------
alter table supplies add column location_id uuid references locations(id) on delete set null;
alter table orders add column location_id uuid references locations(id) on delete set null;
alter table transactions add column location_id uuid references locations(id) on delete set null;
alter table timer_sessions add column location_id uuid references locations(id) on delete set null;
alter table memberships add column location_id uuid references locations(id) on delete set null;
alter table invitations add column location_id uuid references locations(id) on delete set null;

-- Backfill: cada fila existente de estas 4 tablas pasa a apuntar a la sede "Principal"
-- de su propio tenant (la que se creó arriba). memberships/invitations se dejan en null
-- a propósito (null = "Todas las sedes", igual que la Propietaria en el mockup de equipo).
update supplies s set location_id = l.id
  from locations l where l.tenant_id = s.tenant_id and l.name = 'Principal';
update orders o set location_id = l.id
  from locations l where l.tenant_id = o.tenant_id and l.name = 'Principal';
update transactions t set location_id = l.id
  from locations l where l.tenant_id = t.tenant_id and l.name = 'Principal';
update timer_sessions ts set location_id = l.id
  from locations l where l.tenant_id = ts.tenant_id and l.name = 'Principal';

create index supplies_location_idx on supplies(location_id);
create index orders_location_idx on orders(location_id);
create index transactions_location_idx on transactions(location_id);

-- ---------------------------------------------------------------------------
-- 3. Nuevos roles: ventas y tejedora (owner/admin/staff ya existían).
--    ALTER TYPE ... ADD VALUE no puede ir en la misma transacción que su uso,
--    así que estos dos ALTER van primero y solos.
-- ---------------------------------------------------------------------------
alter type member_role add value 'ventas';
alter type member_role add value 'tejedora';
