"use client";

import { useEffect, useState } from "react";
import { Sheet } from "@/components/sheet";
import { duration, money } from "@/lib/format";
import { cancelOrder, getCancelPreview } from "./actions";

type Preview = { totalPaid: number; loggedSeconds: number; hourlyRate: number; suggested: number };

/** Cancelar con devolución justa: todo lo pagado menos el costo real de las horas ya tejidas (no un
 * porcentaje inventado). Reutilizable desde la tarjeta del Kanban y el detalle de pedido. */
export function CancelOrderSheet({
  orderId,
  orderTitle,
  open,
  onClose,
}: {
  orderId: string;
  orderTitle: string;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [refund, setRefund] = useState(0);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setReason("");
    getCancelPreview(orderId).then((p) => {
      if (p.error) {
        setError(p.error);
        setLoading(false);
        return;
      }
      setPreview(p);
      setRefund(p.suggested);
      setLoading(false);
    });
  }, [open, orderId]);

  const confirm = async () => {
    setSubmitting(true);
    setError(null);
    const res = await cancelOrder(orderId, reason, refund);
    setSubmitting(false);
    if (res.error) setError(res.error);
    else onClose();
  };

  const laborWithheld = preview ? preview.totalPaid - preview.suggested : 0;

  return (
    <Sheet open={open} onClose={onClose} title="Cancelar pedido">
      <p className="text-sm text-ink-2">{orderTitle}</p>

      {loading && <p className="text-sm text-muted">Calculando…</p>}

      {!loading && preview && (
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5 rounded-xl bg-surface-muted p-3.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted">Total pagado</span>
              <span className="tabular-nums">{money(preview.totalPaid)}</span>
            </div>
            {preview.loggedSeconds > 0 && (
              <div className="flex justify-between">
                <span className="text-muted">Trabajo ya invertido ({duration(preview.loggedSeconds)})</span>
                <span className="tabular-nums text-primary-hover">− {money(laborWithheld)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
              <span>Se devuelve</span>
              <span className="tabular-nums">{money(refund)}</span>
            </div>
          </div>

          <label className="field">
            Monto a devolver
            <input
              className="input"
              type="number"
              min="0"
              max={preview.totalPaid}
              step="any"
              value={refund}
              onChange={(e) => setRefund(Math.max(0, Math.min(preview.totalPaid, Number(e.target.value) || 0)))}
            />
          </label>
          <label className="field">
            Motivo (opcional)
            <textarea
              className="input min-h-20 py-2.5"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. El cliente ya no lo necesita"
            />
          </label>

          {error && <p className="text-sm text-danger-ink">{error}</p>}

          <button onClick={confirm} disabled={submitting} className="btn-primary">
            {submitting ? "Cancelando…" : refund > 0 ? `Cancelar y devolver ${money(refund)}` : "Cancelar pedido"}
          </button>
          <p className="text-xs text-muted">
            Esto crea un movimiento de "Devolución" en Caja por {money(refund)} y saca el pedido del tablero activo.
          </p>
        </div>
      )}

      {!loading && !preview && error && <p className="text-sm text-danger-ink">{error}</p>}
    </Sheet>
  );
}
