"use client";

import Link from "next/link";
import { useTimer } from "@/components/timer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { clock, dueLabel, duration } from "@/lib/format";
import { goalProgress } from "@/lib/tracking";
import { OrderTimerButton } from "../pedidos/order-timer-button";

/** Tarjeta "hero" de "Mi turno" (Ent-Movil-Turno.dc.html): el bloque claro de id/cliente/título y
 * la tarjeta oscura del cronómetro vivían separados — se fusionan en una sola tarjeta, como en el
 * mockup, con el botón de cronómetro como acción principal grande. */
export function ShiftTimerCard({
  orderId,
  orderShortId,
  title,
  quantity,
  dueDate,
  customerName,
  productId,
  productName,
  goalSeconds,
}: {
  orderId: string;
  orderShortId: string;
  title: string;
  quantity: number;
  dueDate: string | null;
  customerName: string;
  productId: string;
  productName: string;
  goalSeconds: number;
}) {
  const { timer, elapsed, running } = useTimer();
  const isThis = timer?.orderId === orderId;
  const seconds = isThis ? elapsed : 0;
  const { pct, over } = goalProgress(seconds, goalSeconds);

  const status = !isThis
    ? "Toca play para empezar a tejer este pedido."
    : over
      ? "Pasaste la meta: anótalo para ajustar el patrón."
      : `Vas bien · faltan ${duration(Math.max(0, goalSeconds - seconds))}`;

  return (
    <div className="flex flex-col gap-4 rounded-[22px] bg-night p-5 text-on-night">
      <div className="flex items-center gap-2">
        <span className="font-mono text-xs text-on-night-muted">#{orderShortId}</span>
        <span className="chip bg-white/10 text-on-night">{dueLabel(dueDate)}</span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="font-display text-xl font-semibold">
          {title}
          {quantity > 1 ? ` x${quantity}` : ""}
        </span>
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-on-night-muted">{customerName}</span>
          <Link href={`/pedidos/${orderId}`} className="shrink-0 text-sm font-medium text-accent-light hover:underline">
            Ver detalle
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <span className="font-display text-5xl tabular-nums">{clock(seconds)}</span>
        <OrderTimerButton orderId={orderId} productId={productId} productName={productName} size="lg" />
      </div>
      <ProgressBar value={pct} tone={over ? "danger" : "success"} />
      <div className="flex items-center justify-between text-[13px]">
        <span className="text-on-night-muted">{status}</span>
        <span className="text-on-night-muted">Meta: {duration(goalSeconds)}</span>
      </div>
      {isThis && running && <span className="text-[11px] text-accent-light">Tejiendo ahora</span>}
    </div>
  );
}
