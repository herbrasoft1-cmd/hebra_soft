-- =============================================================================
-- HEBRA · Fase 6 Enterprise: finanzas y facturación. Aditiva: nada se borra ni
-- se recrea. El saldo/cartera siguen saliendo de transactions.order_id (ya
-- existía desde el MVP, formalizado en la Fase 8 con get_order_balance /
-- register_order_payment) — no se crea una tabla `payments` nueva.
-- Ejecuta en Supabase → SQL Editor después del 0013.
-- =============================================================================

alter table customers add column document_number text;
alter table tenants add column invoice_seq integer not null default 0;

-- ---------------------------------------------------------------------------
-- Facturas electrónicas: registra cada intento real contra el proveedor
-- configurado en src/lib/invoicing.ts (hoy ninguno — ver ese archivo). El
-- estado siempre refleja lo que de verdad pasó, nunca se inventa.
-- ---------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  order_id uuid not null references orders(id) on delete cascade,
  number int not null,
  provider text,
  status text not null default 'enviando' check (status in ('enviando', 'aceptada_dian', 'rechazada')),
  external_id text,
  pdf_url text,
  error_message text,
  total numeric(12,2) not null,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (tenant_id, number)
);
create index invoices_tenant_idx on invoices(tenant_id, created_at desc);

alter table invoices enable row level security;
create policy invoices_select on invoices for select using (is_member(tenant_id));
-- Mismo criterio que create_remission: owner, admin o ventas (permiso "Emitir
-- facturas y remisiones"). La UI también lo gatea; esto es defensa en profundidad.
create policy invoices_insert on invoices for insert with check (
  exists (select 1 from memberships where tenant_id = invoices.tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas'))
);
create policy invoices_update on invoices for update using (
  exists (select 1 from memberships where tenant_id = invoices.tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas'))
) with check (
  exists (select 1 from memberships where tenant_id = invoices.tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas'))
);

-- Consecutivo atómico por tenant, mismo patrón que remission_seq/create_remission.
create or replace function reserve_invoice_number(p_tenant_id uuid)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare n int;
begin
  if not exists (
    select 1 from memberships
    where tenant_id = p_tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas')
  ) then
    raise exception 'No tienes permiso para emitir facturas.';
  end if;

  update tenants set invoice_seq = invoice_seq + 1
    where id = p_tenant_id
    returning invoice_seq into n;
  return n;
end $$;
