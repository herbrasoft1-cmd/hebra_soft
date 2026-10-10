"use client";

import { useOptimistic, useState, useTransition } from "react";
import { IconArrowRight, IconPlus, IconTrash } from "@/components/icons";
import { RemissionButton } from "@/components/remission-button";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { dueLabel, initials, money, whatsappLink } from "@/lib/format";
import type { Customer, Order, OrderStatus, Tenant } from "@/lib/types";
import { deleteOrder, markPaid, moveOrder, saveOrder } from "./actions";

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
  espera: "bg-line-strong",
  proceso: "bg-accent",
  calidad: "bg-sage",
  enviado: "bg-ink",
};

type ProductOpt = { id: string; name: string; sale_price: number | null };

export function Board({
  orders,
  customers,
  products,
  statusLabels,
  tenant,
}: {
  orders: Order[];
  customers: Customer[];
  products: ProductOpt[];
  statusLabels: Record<OrderStatus, string>;
  tenant: Tenant;
}) {
  const [, startTransition] = useTransition();
  const [optimistic, setOptimistic] = useOptimistic(
    orders,
    (state, { id, status }: { id: string; status: OrderStatus }) =>
      state.map((o) => (o.id === id ? { ...o, status } : o)),
  );
  const [tab, setTab] = useState<OrderStatus>("proceso");
  const [editing, setEditing] = useState<Order | "new" | null>(null);
  const [dragOver, setDragOver] = useState<OrderStatus | null>(null);

  const move = (id: string, status: OrderStatus) =>
    startTransition(async () => {
      setOptimistic({ id, status });
      await moveOrder(id, status);
    });

  const byStatus = (s: OrderStatus) => optimistic.filter((o) => o.status === s);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <IconPlus size={18} /> Nuevo pedido
        </button>
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
                    active ? "bg-primary text-on-primary" : "border-[1.5px] border-line-strong bg-surface text-ink-2"
                  }`}
                >
                  {byStatus(s).length}
                </span>
                <span className={`text-center text-xs leading-tight ${active ? "font-semibold text-primary-ink" : "text-muted"}`}>
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
          <OrderCard key={o.id} order={o} onMove={move} onEdit={() => setEditing(o)} />
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
                  : "border-line bg-surface-2"
              }`}
            >
              <div className="flex items-center gap-2 px-1 pt-1">
                <span className={`size-2 rounded-full ${DOT[s]}`} />
                <h2 className="flex-1 text-[13px] font-semibold tracking-wide text-ink-2 uppercase">{statusLabels[s]}</h2>
                <span className="rounded-full bg-surface px-2.5 py-0.5 text-[12px] font-semibold text-ink-2 shadow-xs">
                  {byStatus(s).length}
                </span>
              </div>
              {byStatus(s).length === 0 && (
                <p className="rounded-xl border border-dashed border-line-strong px-3 py-6 text-center text-xs text-muted">
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
                  <OrderCard order={o} onMove={move} onEdit={() => setEditing(o)} compact />
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo pedido" : "Editar pedido"}>
        {editing !== null && (
          <OrderForm
            key={editing === "new" ? "new" : editing.id}
            order={editing === "new" ? null : editing}
            customers={customers}
            products={products}
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
  compact = false,
}: {
  order: Order;
  onMove: (id: string, s: OrderStatus) => void;
  onEdit: () => void;
  compact?: boolean;
}) {
  const next = STATUSES[STATUSES.indexOf(o.status) + 1];
  const wa = whatsappLink(o.customers?.whatsapp, `Hola ${o.customers?.name ?? ""}, te escribo por tu pedido: ${o.title}`);
  const overdue = o.due_date && o.status !== "enviado" && dueLabel(o.due_date).startsWith("Vencido");

  return (
    <article className="card flex flex-col gap-3 p-4 transition-all hover:shadow-md">
      <button onClick={onEdit} className="flex items-start justify-between gap-2 text-left">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-[15px] font-semibold">
            {o.title}
            {o.quantity > 1 ? ` x${o.quantity}` : ""}
          </span>
          {o.details && <span className="line-clamp-2 text-[13px] text-muted">{o.details}</span>}
        </span>
        <span className={`chip shrink-0 ${overdue ? "bg-primary text-on-primary" : "bg-primary-soft text-primary-ink"}`}>
          {o.status === "enviado" ? "Entregado" : dueLabel(o.due_date)}
        </span>
      </button>

      <div className="flex items-center gap-2.5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sage-soft text-xs font-semibold text-sage-ink">
          {initials(o.customers?.name ?? "?")}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{o.customers?.name ?? "Sin cliente"}</span>
        <span className="flex flex-col items-end">
          <span className="text-[15px] font-semibold tabular-nums">{money(o.price * o.quantity)}</span>
          {o.paid && <span className="text-[11px] font-semibold text-sage-ink">Pagado</span>}
        </span>
      </div>

      <div className={`flex flex-wrap gap-2 ${compact ? "border-t border-line pt-3" : ""}`}>
        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost min-h-11 flex-1 px-3 text-sm">
            WhatsApp
          </a>
        )}
        {(o.status === "calidad" || o.status === "enviado") && (
          <RemissionButton orderId={o.id} className="btn-ghost min-h-11 flex-1 px-3 text-sm" />
        )}
        {next && (
          <button onClick={() => onMove(o.id, next)} className="btn-sage min-h-11 flex-[1.4] px-3 text-sm">
            {NEXT_LABEL[o.status]} <IconArrowRight size={16} />
          </button>
        )}
      </div>
    </article>
  );
}

function OrderForm({
  order,
  customers,
  products,
  onDone,
}: {
  order: Order | null;
  customers: Customer[];
  products: ProductOpt[];
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
        <label className="field">
          Fecha de entrega
          <input className="input" name="due_date" type="date" defaultValue={order?.due_date ?? ""} />
        </label>

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
          <div className="grid gap-3 rounded-xl bg-surface-2 p-3 sm:grid-cols-3">
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
