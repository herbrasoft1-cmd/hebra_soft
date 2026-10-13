"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useOptimistic, useState, useTransition } from "react";
import { ordersAtRisk } from "@/lib/analytics";
import { IconArrowRight, IconDots, IconPlus, IconTrash } from "@/components/icons";
import { InvoiceButton } from "@/components/invoice-button";
import { RemissionButton } from "@/components/remission-button";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Tooltip } from "@/components/ui/tooltip";
import { dueLabel, money, whatsappLink } from "@/lib/format";
import { canFully } from "@/lib/permissions";
import { committedHours, dueUrgency, estimatedHours, progressPct, weeklyAvailableHours, type OrderForLoad } from "@/lib/production";
import type { Availability, Customer, Membership, Order, OrderStatus, Role, SalesChannel, Tenant } from "@/lib/types";
import { deleteOrder, markPaid, moveOrder, saveOrder } from "./actions";
import { CancelOrderSheet } from "./cancel-order-sheet";
import { CapacityView } from "./capacity-view";
import { OrderTimerButton } from "./order-timer-button";

const STATUSES: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];
const SHORT: Record<OrderStatus, string> = {
  espera: "En espera",
  proceso: "En proceso",
  calidad: "Calidad / listo",
  enviado: "Enviado",
};
const NEXT_LABEL: Record<OrderStatus, string | null> = {
  espera: "Empezar",
  proceso: "Pasar a calidad",
  calidad: "Marcar enviado",
  enviado: null,
};
const DOT: Record<OrderStatus, string> = {
  espera: "bg-border-strong",
  proceso: "bg-accent",
  calidad: "bg-success",
  enviado: "bg-ink",
};
const DUE_TONE: Record<"late" | "warn" | "ok", string> = {
  late: "bg-danger-soft text-danger-ink",
  warn: "bg-warning-soft text-warning-ink",
  ok: "bg-primary-soft text-primary-hover",
};

type ProductOpt = { id: string; name: string; sale_price: number | null; labor_seconds: number };
type Crew = { user_id: string; email: string };

export function Board({
  orders,
  cancelledOrders,
  customers,
  products,
  statusLabels,
  tenant,
  role,
  viewerId,
  members,
  crew,
  availability,
  loggedSecondsByOrder,
  outOfStockByProduct,
  channels,
}: {
  orders: Order[];
  cancelledOrders: Order[];
  customers: Customer[];
  products: ProductOpt[];
  statusLabels: Record<OrderStatus, string>;
  tenant: Tenant;
  role: Role;
  viewerId: string;
  members: Membership[];
  crew: Crew[];
  availability: Availability[];
  loggedSecondsByOrder: Record<string, number>;
  outOfStockByProduct: Record<string, string>;
  channels: SalesChannel[];
}) {
  const canIssueInvoices = canFully(role, "issue_invoices");
  const canAssign = canFully(role, "manage_orders");
  const canUseTimer = canFully(role, "use_timer");
  const canCancel = canFully(role, "manage_orders");
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    orders,
    (state, { id, status }: { id: string; status: OrderStatus }) =>
      state.map((o) => (o.id === id ? { ...o, status } : o)),
  );
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<OrderStatus>("proceso");
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const [dragOver, setDragOver] = useState<OrderStatus | null>(null);
  // Permite deep-linking desde fuera (ej. /pedidos?view=capacity desde el botón
  // "Reasignar automáticamente" de Analítica), reutilizando la vista Capacidad real
  // en vez de duplicar su lógica.
  const initialView = searchParams.get("view");
  const [view, setView] = useState<"board" | "capacity" | "cancelled">(
    initialView === "capacity" || initialView === "cancelled" ? initialView : "board",
  );
  const [search, setSearch] = useState("");
  const [tejedoraFilter, setTejedoraFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [onlyRisk, setOnlyRisk] = useState(false);

  const move = (id: string, status: OrderStatus) =>
    startTransition(async () => {
      setOptimistic({ id, status });
      await moveOrder(id, status);
    });

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  const loadOrders: OrderForLoad[] = useMemo(
    () =>
      optimistic.map((o) => {
        const p = o.product_id ? productById.get(o.product_id) : undefined;
        return {
          id: o.id,
          title: o.title,
          assigned_to: o.assigned_to,
          status: o.status,
          estimatedHoursValue: p ? estimatedHours(p.labor_seconds, o.quantity) : 0,
          loggedSeconds: loggedSecondsByOrder[o.id] ?? 0,
        };
      }),
    [optimistic, productById, loggedSecondsByOrder],
  );

  const overloadedUserIds = useMemo(
    () => new Set(crew.map((c) => c.user_id).filter((userId) => committedHours(loadOrders, userId) > weeklyAvailableHours(availability, userId))),
    [crew, loadOrders, availability],
  );

  const outOfStockMap = useMemo(() => new Map(Object.entries(outOfStockByProduct)), [outOfStockByProduct]);
  const riskyIds = useMemo(
    () => new Set(ordersAtRisk(optimistic, outOfStockMap, new Date(), { overloadedUserIds }).map((r) => r.orderId)),
    [optimistic, outOfStockMap, overloadedUserIds],
  );

  const q = search.trim().toLowerCase();
  const filtered = optimistic.filter((o) => {
    if (q && !(o.title.toLowerCase().includes(q) || (o.customers?.name ?? "").toLowerCase().includes(q))) return false;
    if (tejedoraFilter && o.assigned_to !== tejedoraFilter) return false;
    if (channelFilter && o.channel !== channelFilter) return false;
    if (onlyRisk && !riskyIds.has(o.id)) return false;
    return true;
  });
  const byStatus = (s: OrderStatus) => filtered.filter((o) => o.status === s);
  const hasFilters = Boolean(q || tejedoraFilter || channelFilter || onlyRisk);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedControl
          options={[
            { value: "board" as const, label: "Tablero" },
            { value: "capacity" as const, label: "Capacidad" },
            { value: "cancelled" as const, label: `Cancelados${cancelledOrders.length > 0 ? ` · ${cancelledOrders.length}` : ""}` },
          ]}
          value={view}
          onChange={setView}
        />
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <IconPlus size={18} /> Nuevo pedido
        </button>
      </div>

      {view === "capacity" ? (
        <CapacityView members={crew} availability={availability} orders={loadOrders} viewerId={viewerId} canEditAny={role === "owner" || role === "admin"} />
      ) : view === "cancelled" ? (
        <CancelledList orders={cancelledOrders} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <label className="field min-w-48 flex-1">
              <span className="sr-only">Buscar pedido</span>
              <input
                type="search"
                className="input"
                placeholder="Pedido o cliente…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <select className="input w-auto min-h-11" value={tejedoraFilter} onChange={(e) => setTejedoraFilter(e.target.value)}>
              <option value="">Tejedora</option>
              {crew.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.email}
                </option>
              ))}
            </select>
            <select className="input w-auto min-h-11" value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
              <option value="">Canal</option>
              {channels.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setOnlyRisk((v) => !v)}
              className={`chip min-h-11 border px-3 ${onlyRisk ? "border-danger bg-danger-soft text-danger-ink" : "border-border-strong text-ink-2"}`}
            >
              En riesgo{riskyIds.size > 0 ? ` · ${riskyIds.size}` : ""}
            </button>
            {hasFilters && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setTejedoraFilter("");
                  setChannelFilter("");
                  setOnlyRisk(false);
                }}
                className="text-sm font-medium text-muted hover:text-ink-2"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Celular: línea de tiempo tipo hebra */}
          <div className="relative md:hidden">
            <svg className="absolute top-3.5 left-0 w-full text-accent" height="24" viewBox="0 0 350 24" preserveAspectRatio="none" aria-hidden="true">
              <path d="M10 12c25-12 40 12 70 0s45 12 70 0 45 12 70 0 45 12 70 0 30 8 50 0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <div className="relative grid grid-cols-4 gap-1" role="tablist" aria-label="Etapas">
              {STATUSES.map((s) => {
                const active = s === tab;
                return (
                  <button
                    key={s}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(s)}
                    className="flex min-h-19 flex-col items-center gap-1.5"
                  >
                    <span
                      className={`flex size-8 items-center justify-center rounded-full text-[13px] font-semibold shadow-[0_0_0_4px_var(--c-bg)] ${
                        active ? "bg-primary text-on-primary" : "border-[1.5px] border-border-strong bg-surface text-ink-2"
                      }`}
                    >
                      {byStatus(s).length}
                    </span>
                    <span className={`text-center text-xs leading-tight ${active ? "font-semibold text-primary-hover" : "text-muted"}`}>
                      {SHORT[s]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex flex-col gap-3 md:hidden" role="tabpanel">
            {byStatus(tab).length === 0 && <p className="py-8 text-center text-sm text-muted">Nada en esta etapa.</p>}
            {byStatus(tab).map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onMove={move}
                onEdit={() => setEditing(o)}
                canIssueInvoices={canIssueInvoices}
                canUseTimer={canUseTimer}
                canCancel={canCancel}
                blockedSupply={o.product_id ? outOfStockByProduct[o.product_id] : undefined}
                product={o.product_id ? productById.get(o.product_id) : undefined}
                loggedSeconds={loggedSecondsByOrder[o.id] ?? 0}
                assignee={o.assigned_to ? memberById.get(o.assigned_to) : undefined}
              />
            ))}
          </div>

          {/* Escritorio: tablero Kanban con arrastrar y soltar */}
          <div className="hidden overflow-x-auto pb-2 md:block">
            <div className="grid min-w-[1000px] grid-cols-4 gap-4">
              {STATUSES.map((s) => (
                <section
                  key={s}
                  aria-label={statusLabels[s]}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(s);
                  }}
                  onDragLeave={() => setDragOver(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOver(null);
                    const id = e.dataTransfer.getData("text/order-id");
                    if (id) move(id, s);
                  }}
                  className={`flex min-h-[560px] flex-col gap-3 rounded-2xl border p-3.5 transition-all ${
                    dragOver === s
                      ? "border-primary/40 bg-primary-soft/40 shadow-inner"
                      : "border-border bg-surface-muted"
                  }`}
                >
                  <div className="flex items-center gap-2 px-1 pt-1">
                    <span className={`size-2 rounded-full ${DOT[s]}`} />
                    <h2 className="flex-1 text-[13px] font-semibold tracking-wide text-ink-2 uppercase">{statusLabels[s]}</h2>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-ink-2">
                      {byStatus(s).length}
                    </span>
                  </div>
                  {byStatus(s).length === 0 && (
                    <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-xs text-muted">
                      Sin pedidos aquí
                    </p>
                  )}
                  {byStatus(s).map((o) => (
                    <div
                      key={o.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text/order-id", o.id)}
                      className="cursor-grab transition-transform active:cursor-grabbing active:scale-[0.98]"
                    >
                      <OrderCard
                        order={o}
                        onMove={move}
                        onEdit={() => setEditing(o)}
                        canIssueInvoices={canIssueInvoices}
                        canUseTimer={canUseTimer}
                        canCancel={canCancel}
                        blockedSupply={o.product_id ? outOfStockByProduct[o.product_id] : undefined}
                        product={o.product_id ? productById.get(o.product_id) : undefined}
                        loggedSeconds={loggedSecondsByOrder[o.id] ?? 0}
                        assignee={o.assigned_to ? memberById.get(o.assigned_to) : undefined}
                        compact
                      />
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo pedido" : "Editar pedido"}>
        {editing !== null && (
          <OrderForm
            key={editing === "new" ? "new" : editing.id}
            order={editing === "new" ? null : editing}
            customers={customers}
            products={products}
            crew={canAssign ? crew : []}
            channels={channels}
            tenant={tenant}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function OrderCard({
  order: o,
  onMove,
  onEdit,
  canIssueInvoices,
  canUseTimer,
  canCancel,
  blockedSupply,
  product,
  loggedSeconds,
  assignee,
  compact = false,
}: {
  order: Order;
  onMove: (id: string, s: OrderStatus) => void;
  onEdit: () => void;
  canIssueInvoices: boolean;
  canUseTimer: boolean;
  canCancel: boolean;
  blockedSupply?: string;
  product?: ProductOpt;
  loggedSeconds: number;
  assignee?: Membership;
  compact?: boolean;
}) {
  const [showMore, setShowMore] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const next = STATUSES[STATUSES.indexOf(o.status) + 1];
  const wa = whatsappLink(o.customers?.whatsapp, `Hola ${o.customers?.name ?? ""}, te escribo por tu pedido: ${o.title}`);
  const urgency = dueUrgency(o.due_date, o.status, new Date());
  const estHours = product ? estimatedHours(product.labor_seconds, o.quantity) : 0;
  const pct = estHours > 0 ? progressPct(loggedSeconds, estHours) : null;
  const hasOverflow = Boolean(wa) || (canIssueInvoices && (o.status === "calidad" || o.status === "enviado"));

  return (
    <article className="card flex flex-col gap-3 p-4 transition-all">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">#{o.id.slice(0, 6).toUpperCase()}</span>
        <div className="flex shrink-0 gap-1.5">
          {blockedSupply && (
            <Tooltip label={`Falta: ${blockedSupply}`} side="top">
              <span className="chip bg-danger-soft text-danger-ink">Bloqueado</span>
            </Tooltip>
          )}
          <span className={`chip ${DUE_TONE[urgency]}`}>{o.status === "enviado" ? "Entregado" : dueLabel(o.due_date)}</span>
        </div>
      </div>
      <button onClick={onEdit} className="flex flex-col gap-0.5 text-left">
        <span className="text-[15px] font-semibold">
          {o.title}
          {o.quantity > 1 ? ` x${o.quantity}` : ""}
        </span>
        <span className="truncate text-[12px] text-muted">
          {o.customers?.name ?? "Sin cliente"}
          {o.channel ? ` · ${o.channel}` : ""}
        </span>
      </button>

      {pct !== null && (
        <div className="flex flex-col gap-1">
          <ProgressBar value={pct} tone={pct >= 100 ? "success" : "primary"} />
          <div className="flex justify-between text-[11px] text-muted">
            <span>
              {(loggedSeconds / 3600).toFixed(1).replace(".", ",")} / {estHours.toFixed(1).replace(".", ",")} h
            </span>
            <span>{pct}%</span>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2.5">
        {assignee ? (
          <Avatar id={assignee.user_id} name={assignee.email} size={28} />
        ) : (
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-dashed border-border-strong text-[10px] text-muted">
            —
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-sm">{assignee?.email ?? "Sin asignar"}</span>
        <span className="flex flex-col items-end">
          <span className="text-[15px] font-semibold tabular-nums">{money(o.price * o.quantity)}</span>
          {o.paid && <span className="text-[11px] font-semibold text-success-ink">Pagado</span>}
        </span>
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "border-t border-border pt-3" : ""}`}>
        {canUseTimer && product && o.status !== "enviado" && (
          <OrderTimerButton orderId={o.id} productId={product.id} productName={product.name} />
        )}
        <Link href={`/pedidos/${o.id}`} className="btn-ghost min-h-11 flex-1 px-3 text-sm">
          Detalle
        </Link>
        {hasOverflow && (
          <button
            type="button"
            onClick={() => setShowMore(true)}
            aria-label="Más acciones"
            className="btn-ghost min-h-11 px-3 text-sm"
          >
            <IconDots size={16} />
          </button>
        )}
        {canCancel && o.status !== "enviado" && (
          <button type="button" onClick={() => setShowCancel(true)} className="btn-ghost min-h-11 px-3 text-sm text-primary-hover">
            Cancelar
          </button>
        )}
        {next && (
          <button onClick={() => onMove(o.id, next)} className="btn-sage min-h-11 flex-[1.4] px-3 text-sm">
            {NEXT_LABEL[o.status]} <IconArrowRight size={16} />
          </button>
        )}
      </div>

      {hasOverflow && (
        <Sheet open={showMore} onClose={() => setShowMore(false)} title="Más acciones">
          <div className="flex flex-col gap-2">
            {wa && (
              <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost min-h-11 w-full text-sm">
                WhatsApp
              </a>
            )}
            {canIssueInvoices && (o.status === "calidad" || o.status === "enviado") && (
              <RemissionButton orderId={o.id} className="btn-ghost min-h-11 w-full text-sm" />
            )}
            {canIssueInvoices && (o.status === "calidad" || o.status === "enviado") && (
              <InvoiceButton orderId={o.id} className="btn-ghost min-h-11 w-full text-sm" />
            )}
          </div>
        </Sheet>
      )}
      {canCancel && <CancelOrderSheet orderId={o.id} orderTitle={o.title} open={showCancel} onClose={() => setShowCancel(false)} />}
    </article>
  );
}

function CancelledList({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <p className="card p-7 text-center text-sm text-muted">No hay pedidos cancelados.</p>;
  }
  return (
    <ul className="card flex flex-col overflow-hidden">
      {orders.map((o) => (
        <li key={o.id} className="flex flex-col gap-1 border-b border-border px-4 py-3.5 last:border-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[15px] font-medium">
              {o.title}
              {o.quantity > 1 ? ` x${o.quantity}` : ""}
            </span>
            <span className="text-xs text-muted">{o.cancelled_at ? new Date(o.cancelled_at).toLocaleDateString("es-CO") : ""}</span>
          </div>
          <div className="flex items-center justify-between gap-2 text-xs text-ink-2">
            <span className="truncate">{o.customers?.name ?? "Sin cliente"}{o.cancel_reason ? ` · ${o.cancel_reason}` : ""}</span>
            <span className="shrink-0 tabular-nums">
              {o.refund_amount && o.refund_amount > 0 ? `Devuelto: ${money(o.refund_amount)}` : "Sin devolución"}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function OrderForm({
  order,
  customers,
  products,
  crew,
  channels,
  onDone,
}: {
  order: Order | null;
  customers: Customer[];
  products: ProductOpt[];
  crew: Crew[];
  channels: SalesChannel[];
  tenant: Tenant;
  onDone: () => void;
}) {
  const [customerId, setCustomerId] = useState(order?.customer_id ?? "");
  const [price, setPrice] = useState(String(order?.price ?? ""));
  const [title, setTitle] = useState(order?.title ?? "");

  const onProduct = (id: string) => {
    const p = products.find((x) => x.id === id);
    if (p) {
      if (!title) setTitle(p.name);
      if (p.sale_price && !price) setPrice(String(p.sale_price));
    }
  };

  return (
    <div className="flex max-h-[70dvh] flex-col gap-4 overflow-y-auto">
      <form
        action={async (fd) => {
          await saveOrder(fd);
          onDone();
        }}
        className="flex flex-col gap-3.5"
      >
        {order && <input type="hidden" name="id" value={order.id} />}

        <label className="field">
          Del recetario (opcional)
          <select className="input" name="product_id" defaultValue={order?.product_id ?? ""} onChange={(e) => onProduct(e.target.value)}>
            <option value="">Pieza personalizada</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.sale_price ? ` · ${money(p.sale_price)}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          ¿Qué te pidieron?
          <input className="input" name="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        </label>
        <label className="field">
          Detalles (colores, tallas, personalización)
          <textarea className="input min-h-20 py-2.5" name="details" defaultValue={order?.details ?? ""} />
        </label>
        <div className="grid grid-cols-3 gap-3">
          <label className="field">
            Cantidad
            <input className="input" name="quantity" type="number" min="1" defaultValue={order?.quantity ?? 1} />
          </label>
          <label className="field col-span-2">
            Precio unitario
            <input className="input" name="price" type="number" inputMode="numeric" min="0" value={price} onChange={(e) => setPrice(e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Fecha de entrega
            <input className="input" name="due_date" type="date" defaultValue={order?.due_date ?? ""} />
          </label>
          <label className="field">
            Canal
            <select className="input" name="channel" defaultValue={order?.channel ?? ""}>
              <option value="">Sin especificar</option>
              {channels.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>
        {crew.length > 0 && (
          <label className="field">
            Asignar a
            <select className="input" name="assigned_to" defaultValue={order?.assigned_to ?? ""}>
              <option value="">Sin asignar</option>
              {crew.map((c) => (
                <option key={c.user_id} value={c.user_id}>
                  {c.email}
                </option>
              ))}
            </select>
          </label>
        )}

        <label className="field">
          Cliente
          <select className="input" name="customer_id" value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
            <option value="">+ Cliente nuevo</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        {!customerId && (
          <div className="grid gap-3 rounded-xl bg-surface-muted p-3 sm:grid-cols-3">
            <label className="field">
              Nombre
              <input className="input" name="new_customer_name" />
            </label>
            <label className="field">
              WhatsApp
              <input className="input" name="new_customer_whatsapp" inputMode="tel" />
            </label>
            <label className="field">
              Instagram
              <input className="input" name="new_customer_instagram" placeholder="@" />
            </label>
          </div>
        )}

        <SubmitButton>{order ? "Guardar cambios" : "Crear pedido"}</SubmitButton>
      </form>

      {order && !order.paid && (
        <form
          action={async (fd) => {
            await markPaid(fd);
            onDone();
          }}
          className="flex flex-wrap items-end gap-2"
        >
          <input type="hidden" name="id" value={order.id} />
          <label className="field flex-1">
            Registrar pago en caja
            <select className="input" name="payment_method" defaultValue="Transferencia">
              {["Transferencia", "Nequi", "Daviplata", "Efectivo", "Tarjeta"].map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <SubmitButton className="btn-sage">Marcar pagado</SubmitButton>
        </form>
      )}

      {order && (
        <form
          action={async (fd) => {
            await deleteOrder(fd);
            onDone();
          }}
          onSubmit={(e) => !confirm("¿Eliminar este pedido?") && e.preventDefault()}
        >
          <input type="hidden" name="id" value={order.id} />
          <button className="btn w-full text-sm text-muted">
            <IconTrash size={16} /> Eliminar pedido
          </button>
        </form>
      )}
    </div>
  );
}
