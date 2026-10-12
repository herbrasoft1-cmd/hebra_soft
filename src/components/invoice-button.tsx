"use client";

import { useState } from "react";
import { createInvoice } from "@/app/(app)/finanzas/actions";
import { IconDoc } from "./icons";

/** Botón "Emitir factura": igual criterio que RemissionButton (issue_invoices, no view_finance),
 * así que ventas también lo puede usar desde el Kanban sin entrar a /finanzas. */
export function InvoiceButton({ orderId, className = "btn-ghost" }: { orderId: string; className?: string }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const emit = async () => {
    setBusy(true);
    setMessage(null);
    const res = await createInvoice(orderId);
    setBusy(false);
    if (res.error) setMessage({ text: res.error, ok: false });
    else if (res.invoice?.status === "rechazada") setMessage({ text: res.invoice.error_message ?? "Factura rechazada.", ok: false });
    else setMessage({ text: `Factura N.º ${res.invoice?.number} enviada.`, ok: true });
  };

  return (
    <div className="flex flex-col gap-1">
      <button type="button" onClick={emit} disabled={busy} className={className}>
        <IconDoc size={18} /> {busy ? "Emitiendo…" : "Factura"}
      </button>
      {message && <p className={`text-xs ${message.ok ? "text-success-ink" : "text-danger-ink"}`}>{message.text}</p>}
    </div>
  );
}
