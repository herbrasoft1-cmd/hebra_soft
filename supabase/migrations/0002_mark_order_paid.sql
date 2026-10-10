-- =============================================================================
-- HEBRA · Marca un pedido como pagado y registra el ingreso en caja de forma
-- atómica (antes eran dos escrituras separadas desde el cliente: si la segunda
-- fallaba, el pedido quedaba marcado como pagado sin su transacción en caja).
-- Ejecuta este archivo en Supabase → SQL Editor después del 0001.
-- =============================================================================

create or replace function mark_order_paid(p_order_id uuid, p_payment_method text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare o orders;
begin
  select * into o from orders where id = p_order_id;
  if o.id is null then raise exception 'Pedido no encontrado'; end if;
  if o.paid then return; end if;

  update orders set paid = true where id = o.id;

  insert into transactions (tenant_id, type, category, description, amount, payment_method, order_id)
  values (o.tenant_id, 'ingreso', 'Venta', o.title, o.price * o.quantity, p_payment_method, o.id);
end $$;
