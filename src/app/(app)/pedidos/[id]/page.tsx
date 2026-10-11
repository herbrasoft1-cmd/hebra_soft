import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { ordersAtRisk } from "@/lib/analytics";
import { dueLabel, money, whatsappLink } from "@/lib/format";
import { canFully } from "@/lib/permissions";
import { estimatedHours, progressPct } from "@/lib/production";
import { getSession } from "@/lib/tenant";
import type { Membership, OrderStatus } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { moveOrder } from "../actions";
import { OrderTimeline } from "./order-timeline";
import { PaymentCard } from "./payment-card";
import { ShareTrackingButton } from "./share-tracking-button";
import { SupportAssignForm } from "./support-assign-form";

export const metadata = { title: "Pedido" };

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);

  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(id, name, whatsapp, instagram, address)")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!order) notFound();

  const [{ data: product }, { data: members }, { data: balance }, { data: loggedSessions }] = await Promise.all([
    order.product_id
      ? supabase.from("products").select("id, name, labor_seconds, product_supplies(supplies(id, name, quantity_remaining))").eq("id", order.product_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.rpc("list_members", { p_tenant_id: tenant.id }),
    supabase.rpc("get_order_balance", { p_order_id: id }),
    supabase.from("timer_sessions").select("seconds").eq("tenant_id", tenant.id).eq("order_id", id),
  ]);

  type ProductWithLines = { id: string; name: string; labor_seconds: number; product_supplies: { supplies: { id: string; name: string; quantity_remaining: number } | null }[] };
  const productRow = product as unknown as ProductWithLines | null;
  const outOfStockByProduct = new Map<string, string>();
  const empty = productRow?.product_supplies.find((l) => Number(l.supplies?.quantity_remaining ?? 0) <= 0);
  if (empty?.supplies && productRow) outOfStockByProduct.set(productRow.id, empty.supplies.name);

  const risk = ordersAtRisk(
    [{ id: order.id, title: order.title, due_date: order.due_date, status: order.status, product_id: order.product_id, assigned_to: order.assigned_to }],
    outOfStockByProduct,
    new Date(),
  );

  const allMembers = (members ?? []) as Membership[];
  const crew = allMembers.filter((m) => canFully(m.role, "use_timer"));
  const assignee = order.assigned_to ? allMembers.find((m) => m.user_id === order.assigned_to) : undefined;

  const { data: customerOrders } = order.customer_id
    ? await supabase.from("orders").select("price, quantity, created_at").eq("tenant_id", tenant.id).eq("customer_id", order.customer_id)
    : { data: [] };
  const customerStats = (customerOrders ?? []).reduce(
    (acc, o) => ({ count: acc.count + 1, total: acc.total + Number(o.price) * Number(o.quantity) }),
    { count: 0, total: 0 },
  );
  const customerSince = (customerOrders ?? []).reduce((min: string | null, o) => (!min || o.created_at < min ? o.created_at : min), null as string | null);

  const loggedSeconds = (loggedSessions ?? []).reduce((s, r) => s + Number(r.seconds), 0);
  const estHours = productRow ? estimatedHours(productRow.labor_seconds, order.quantity) : 0;
  const pct = estHours > 0 ? progressPct(loggedSeconds, estHours) : null;

  const wa = whatsappLink(order.customers?.whatsapp, `Hola ${order.customers?.name ?? ""}, te escribo por tu pedido: ${order.title}`);
  const canAssign = canFully(role, "manage_orders");
  const statuses: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];
  const next = statuses[statuses.indexOf(order.status) + 1];

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <Link href="/pedidos" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
          <IconBack size={18} /> Pedidos
        </Link>
        <span className="font-mono text-xs text-muted">#{order.id.slice(0, 6).toUpperCase()}</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip bg-primary-soft text-primary-hover">{dueLabel(order.due_date)}</span>
          {order.channel && <span className="chip bg-surface-muted text-ink-2">{order.channel}</span>}
        </div>
        <h1 className="font-display text-2xl font-semibold">
          {order.title}
          {order.quantity > 1 ? ` x${order.quantity}` : ""}
        </h1>
        {order.details && <p className="text-sm text-ink-2">{order.details}</p>}
      </div>

      <OrderTimeline status={order.status} statusLabels={mod.statusLabels} />

      {risk.length > 0 && (
        <div className="flex flex-col gap-1 rounded-2xl bg-danger-soft p-4">
          {risk.map((r, i) => (
            <p key={i} className="text-sm text-danger-ink">
              {r.text}
            </p>
          ))}
        </div>
      )}

      <section className="card flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          {assignee ? <Avatar id={assignee.user_id} name={assignee.email} size={36} /> : <Avatar id="sin-asignar" name="?" size={36} />}
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-medium">{assignee?.email.split("@")[0] ?? "Sin asignar"}</span>
            {pct !== null && (
              <span className="text-xs text-muted">
                {(loggedSeconds / 3600).toFixed(1).replace(".", ",")} / {estHours.toFixed(1).replace(".", ",")} h · {pct}%
              </span>
            )}
          </span>
        </div>
        {canAssign && <SupportAssignForm orderId={order.id} crew={crew} currentUserId={order.assigned_to} />}
      </section>

      {order.customers && (
        <section className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            <Avatar id={order.customers.id} name={order.customers.name} size={40} />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">{order.customers.name}</span>
              <span className="truncate text-xs text-muted">
                {customerSince ? `Cliente desde ${new Date(customerSince).getFullYear()}` : "Cliente nuevo"} · {customerStats.count} pedido
                {customerStats.count === 1 ? "" : "s"} · {money(customerStats.total)}
              </span>
            </span>
          </div>
          {order.customers.address && <p className="text-sm text-ink-2">{order.customers.address}</p>}
          <div className="flex gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost min-h-11 flex-1 text-sm">
                WhatsApp
              </a>
            )}
            {order.customers.instagram && (
              <a
                href={`https://instagram.com/${order.customers.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost min-h-11 flex-1 text-sm"
              >
                Instagram
              </a>
            )}
          </div>
        </section>
      )}

      <PaymentCard
        orderId={order.id}
        title={order.title}
        total={order.price * order.quantity}
        balance={Number(balance ?? order.price * order.quantity)}
        canManage={canAssign}
        customerWhatsapp={order.customers?.whatsapp ?? null}
        customerName={order.customers?.name ?? null}
      />

      <div className="flex flex-col gap-2.5">
        <ShareTrackingButton token={order.tracking_token} />
        {canAssign && next && (
          <form action={async () => { "use server"; await moveOrder(order.id, next); }}>
            <button className="btn-primary w-full">Pasar a {mod.statusLabels[next].toLowerCase()}</button>
          </form>
        )}
      </div>
    </div>
  );
}
