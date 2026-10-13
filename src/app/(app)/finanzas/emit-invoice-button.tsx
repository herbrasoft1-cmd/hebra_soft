"use client";

import { useState } from "react";
import { Sheet } from "@/components/sheet";
import { createInvoice } from "./actions";

type EligibleOrder = { id: string; label: string };

/** Mismo flujo que InvoiceButton (usado en el Kanban de Pedidos), pero con selector de pedido —
 * Finanzas no tiene un pedido "actual" de contexto como sí lo tiene una tarjeta del tablero. */
export function EmitInvoiceButton({ orders }: { orders: EligibleOrder[] }) {
  const [open, setOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ text: string; ok: boolean } | null>(null);

  const close = () => {
    setOpen(false);
    setOrderId("");
    setResult(null);
  };

  const emit = async () => {
    if (!orderId) return;
    setBusy(true);
    const res = await createInvoice(orderId);
    setBusy(false);
    if (res.error) setResult({ text: res.error, ok: false });
    else if (res.invoice?.status === "rechazada") setResult({ text: res.invoice.error_message ?? "Factura rechazada.", ok: false });
    else setResult({ text: `Factura N.º ${res.invoice?.number} enviada.`, ok: true });
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-10 px-4 text-sm">
        + Emitir factura
      </button>
      <Sheet open={open} onClose={close} title="Emitir factura">
        {orders.length === 0 ? (
          <p className="text-sm text-muted">No hay pedidos pagados sin factura todavía.</p>
        ) : (
          <div className="flex flex-col gap-3.5">
            <label className="field">
              Pedido
              <select
                className="input"
                value={orderId}
                onChange={(e) => {
                  setOrderId(e.target.value);
                  setResult(null);
                }}
              >
                <option value="">Elige un pedido pagado…</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="button" onClick={emit} disabled={!orderId || busy} className="btn-primary">
              {busy ? "Emitiendo…" : "Emitir factura"}
            </button>
            {result && <p className={`text-sm ${result.ok ? "text-success-ink" : "text-danger-ink"}`}>{result.text}</p>}
          </div>
        )}
      </Sheet>
    </>
  );
}
