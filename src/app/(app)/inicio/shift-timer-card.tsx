"use client";

import { useTimer } from "@/components/timer";
import { ProgressBar } from "@/components/ui/progress-bar";
import { clock, duration } from "@/lib/format";
import { goalProgress } from "@/lib/tracking";
import { OrderTimerButton } from "../pedidos/order-timer-button";

/** Tarjeta grande de "Mi turno": reloj y barra de progreso contra la meta del patrón. */
export function ShiftTimerCard({
  orderId,
  productId,
  productName,
  goalSeconds,
}: {
  orderId: string;
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
    <div className="flex flex-col gap-4 rounded-2xl bg-night p-5 text-on-night">
      <span className="text-[13px] font-medium text-on-night-muted">{productName}</span>
      <div className="flex items-center justify-between gap-3">
        <span className="font-display text-5xl tabular-nums">{clock(seconds)}</span>
        <OrderTimerButton orderId={orderId} productId={productId} productName={productName} />
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
