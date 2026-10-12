-- =============================================================================
-- HEBRA · Cancelación de pedidos con devolución justa. Aditiva: nada se borra
-- ni se recrea. No se toca el enum order_status (ya documentado el riesgo de
-- ALTER TYPE ... ADD VALUE en la misma transacción que su uso) — cancelar se
-- modela como algo ortogonal al estado, no un quinto valor del Kanban.
-- Solo aplica a pedidos no enviados: consume_order_supplies (MVP) únicamente
-- descuenta stock al llegar a 'enviado', así que cancelar antes de eso nunca
-- tiene insumos que revertir.
-- Ejecuta en Supabase → SQL Editor después del 0014.
-- =============================================================================

alter table orders add column cancelled_at timestamptz;
alter table orders add column cancel_reason text;
alter table orders add column refund_amount numeric(12,2);

-- La devolución se registra como una transacción nueva (tipo gasto, categoría
-- "Devolución"), nunca se borra ni edita la venta original: queda el
-- historial completo, igual criterio que las facturas rechazadas de Finanzas.
create or replace function cancel_order(p_order_id uuid, p_reason text, p_refund_amount numeric)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare o orders; paid numeric;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null then raise exception 'Pedido no encontrado'; end if;
  if not exists (
    select 1 from memberships
    where tenant_id = o.tenant_id and user_id = auth.uid() and role in ('owner', 'admin', 'ventas')
  ) then
    raise exception 'No tienes permiso para cancelar pedidos.';
  end if;
  if o.status = 'enviado' then raise exception 'No se puede cancelar un pedido ya enviado.'; end if;
  if o.cancelled_at is not null then raise exception 'Este pedido ya está cancelado.'; end if;

  select coalesce(sum(amount), 0) into paid from transactions where order_id = o.id and type = 'ingreso';
  if p_refund_amount < 0 or p_refund_amount > paid then
    raise exception 'El monto de devolución no es válido.';
  end if;

  update orders set cancelled_at = now(), cancel_reason = p_reason, refund_amount = p_refund_amount
    where id = p_order_id
    returning * into o;

  if p_refund_amount > 0 then
    insert into transactions (tenant_id, type, category, description, amount, order_id, location_id)
    values (o.tenant_id, 'gasto', 'Devolución', o.title, p_refund_amount, o.id, o.location_id);
  end if;

  return o;
end $$;
