import { PageHeader } from "@/components/ui/page-header";
import { getActiveLocationId } from "@/lib/location";
import { can, canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { Availability, Customer, Membership, Order, SalesChannel } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { Board } from "./board";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const { supabase, tenant, role, user } = await getSession();
  const mod = getIndustryModule(tenant.industry);
  const activeLocationId = await getActiveLocationId();

  // El tablero es para trabajo activo, no historial: pedidos sin enviar + enviados en los
  // últimos 90 días, con un límite de seguridad para negocios con muchísimos pedidos.
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();

  let ordersQuery = supabase
    .from("orders")
    .select("*, customers(name, whatsapp, instagram, address)")
    .eq("tenant_id", tenant.id)
    .is("cancelled_at", null)
    .or(`status.neq.enviado,updated_at.gte.${cutoff}`);
  if (activeLocationId) ordersQuery = ordersQuery.eq("location_id", activeLocationId);
  // Tejedora: solo sus pedidos asignados + los que nadie ha tomado todavía.
  if (can(role, "manage_orders") === "own") ordersQuery = ordersQuery.or(`assigned_to.eq.${user.id},assigned_to.is.null`);

  let cancelledQuery = supabase
    .from("orders")
    .select("*, customers(name, whatsapp, instagram, address)")
    .eq("tenant_id", tenant.id)
    .not("cancelled_at", "is", null)
    .order("cancelled_at", { ascending: false })
    .limit(50);
  if (activeLocationId) cancelledQuery = cancelledQuery.eq("location_id", activeLocationId);

  const [{ data: orders }, { data: cancelledOrders }, { data: customers }, { data: products }, { data: members }, { data: availability }, { data: channels }] =
    await Promise.all([
      ordersQuery.order("due_date", { ascending: true, nullsFirst: false }).limit(300),
      cancelledQuery,
      supabase.from("customers").select("*").eq("tenant_id", tenant.id).order("name").limit(300),
      supabase
        .from("products")
        .select("id, name, sale_price, labor_seconds, product_supplies(supplies(name, quantity_remaining))")
        .eq("tenant_id", tenant.id),
      supabase.rpc("list_members", { p_tenant_id: tenant.id }),
      supabase.from("availability").select("*").eq("tenant_id", tenant.id),
      supabase.from("sales_channels").select("*").eq("tenant_id", tenant.id).order("created_at"),
    ]);

  const list = (orders ?? []) as Order[];
  const orderIds = list.map((o) => o.id);
  const { data: sessions } =
    orderIds.length > 0
      ? await supabase.from("timer_sessions").select("order_id, seconds").eq("tenant_id", tenant.id).in("order_id", orderIds)
      : { data: [] as { order_id: string | null; seconds: number }[] };
  const loggedSecondsByOrder = new Map<string, number>();
  for (const s of sessions ?? []) {
    if (!s.order_id) continue;
    loggedSecondsByOrder.set(s.order_id, (loggedSecondsByOrder.get(s.order_id) ?? 0) + Number(s.seconds));
  }

  type ProductRow = { id: string; name: string; sale_price: number | null; labor_seconds: number; product_supplies: { supplies: { name: string; quantity_remaining: number } | null }[] };
  const productRows = (products ?? []) as unknown as ProductRow[];
  const outOfStockByProduct: Record<string, string> = {};
  for (const p of productRows) {
    const empty = p.product_supplies.find((l) => Number(l.supplies?.quantity_remaining ?? 0) <= 0);
    if (empty?.supplies) outOfStockByProduct[p.id] = empty.supplies.name;
  }

  const allMembers = (members ?? []) as Membership[];
  const crew = allMembers.filter((m) => canFully(m.role, "use_timer"));
  const active = list.filter((o) => o.status !== "enviado").length;

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${active} pedido${active === 1 ? "" : "s"} activo${active === 1 ? "" : "s"}`} />
      <Board
        orders={list}
        cancelledOrders={(cancelledOrders ?? []) as Order[]}
        customers={(customers ?? []) as Customer[]}
        products={productRows.map((p) => ({ id: p.id, name: p.name, sale_price: p.sale_price, labor_seconds: p.labor_seconds }))}
        statusLabels={mod.statusLabels}
        tenant={tenant}
        role={role}
        viewerId={user.id}
        members={allMembers}
        crew={crew.map((m) => ({ user_id: m.user_id, email: m.email, avatar_url: m.avatar_url }))}
        availability={(availability ?? []) as Availability[]}
        loggedSecondsByOrder={Object.fromEntries(loggedSecondsByOrder)}
        outOfStockByProduct={outOfStockByProduct}
        channels={(channels ?? []) as SalesChannel[]}
      />
    </>
  );
}
