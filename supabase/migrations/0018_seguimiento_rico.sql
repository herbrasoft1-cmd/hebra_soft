-- =============================================================================
-- HEBRA · Portal de seguimiento: conecta datos que ya existen desde la Fase 8
-- (product_steps/order_step_progress, "Mi turno") pero que get_order_tracking
-- nunca unía — el portal solo mostraba 4 pasos genéricos sin quién teje el
-- pedido ni cuánto avanzó de verdad. Aditiva, misma función reemplazada.
-- Ejecuta en Supabase → SQL Editor después del 0017.
-- =============================================================================

drop function if exists get_order_tracking(text);
create function get_order_tracking(p_token text)
returns table (
  order_id uuid,
  title text,
  product_name text,
  status order_status,
  due_date date,
  customer_first_name text,
  total numeric,
  paid boolean,
  balance numeric,
  progress_photo_url text,
  tenant_name text,
  tenant_logo_url text,
  tenant_whatsapp text,
  assignee_first_name text,
  steps_total int,
  steps_done int,
  current_step_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select o.id, o.title, p.name, o.status, o.due_date,
    split_part(coalesce(c.name, ''), ' ', 1),
    o.price * o.quantity, o.paid,
    greatest(o.price * o.quantity - coalesce((
      select sum(tx.amount) from transactions tx where tx.order_id = o.id and tx.type = 'ingreso'
    ), 0), 0),
    o.progress_photo_url, t.name, t.logo_url, t.whatsapp,
    coalesce(nullif(split_part(au.raw_user_meta_data->>'full_name', ' ', 1), ''), split_part(au.email, '@', 1)),
    (select count(*)::int from product_steps ps where ps.product_id = o.product_id),
    (select count(*)::int from order_step_progress osp join product_steps ps on ps.id = osp.step_id where osp.order_id = o.id),
    (select ps.name from product_steps ps
       where ps.product_id = o.product_id
         and ps.id not in (select step_id from order_step_progress where order_id = o.id)
       order by ps.position limit 1)
  from orders o
  left join products p on p.id = o.product_id
  left join customers c on c.id = o.customer_id
  left join tenants t on t.id = o.tenant_id
  left join auth.users au on au.id = o.assigned_to
  where o.tracking_token = p_token;
$$;
