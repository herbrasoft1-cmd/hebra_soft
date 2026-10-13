"use client";

import { IconPause, IconPlay } from "@/components/icons";
import { useTimer } from "@/components/timer";

const SIZE = { sm: { box: "size-9", icon: 16 }, lg: { box: "size-16", icon: 26 } } as const;

/** Cronómetro vinculado a un pedido: lo que se avanza cuenta para su progreso, no para el costo
 * del patrón. `size="lg"` es para "Mi turno" (acción principal de esa pantalla, mockup Movil-Turno
 * la trae grande) — el Kanban de Pedidos sigue usando el tamaño chico de siempre. */
export function OrderTimerButton({
  orderId,
  productId,
  productName,
  size = "sm",
}: {
  orderId: string;
  productId: string;
  productName: string;
  size?: "sm" | "lg";
}) {
  const { timer, running, start, pause } = useTimer();
  const isThis = timer?.orderId === orderId && running;
  const s = SIZE[size];
  return (
    <button
      onClick={() => (isThis ? pause() : start(productId, productName, orderId))}
      aria-label={isThis ? "Pausar cronómetro" : "Iniciar cronómetro de este pedido"}
      className={`flex ${s.box} shrink-0 cursor-pointer items-center justify-center rounded-full transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 ${
        isThis ? "bg-accent text-night" : "bg-success text-on-primary"
      }`}
    >
      {isThis ? <IconPause size={s.icon} /> : <IconPlay size={s.icon} />}
    </button>
  );
}
