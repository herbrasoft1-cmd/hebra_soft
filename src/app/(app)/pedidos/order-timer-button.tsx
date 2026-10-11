"use client";

import { IconPause, IconPlay } from "@/components/icons";
import { useTimer } from "@/components/timer";

/** Cronómetro vinculado a un pedido: lo que se avanza cuenta para su progreso, no para el costo del patrón. */
export function OrderTimerButton({ orderId, productId, productName }: { orderId: string; productId: string; productName: string }) {
  const { timer, running, start, pause } = useTimer();
  const isThis = timer?.orderId === orderId && running;
  return (
    <button
      onClick={() => (isThis ? pause() : start(productId, productName, orderId))}
      aria-label={isThis ? "Pausar cronómetro" : "Iniciar cronómetro de este pedido"}
      className={`flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        isThis ? "bg-accent text-night" : "bg-success text-on-primary"
      }`}
    >
      {isThis ? <IconPause size={16} /> : <IconPlay size={16} />}
    </button>
  );
}
