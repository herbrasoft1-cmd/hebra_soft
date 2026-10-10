"use client";

import { IconPause, IconPlay } from "@/components/icons";
import { useTimer } from "@/components/timer";

/** Un toque para empezar (o pausar) el cronómetro de este patrón. */
export function StartTimerButton({ productId, productName }: { productId: string; productName: string }) {
  const { timer, running, start, pause } = useTimer();
  const isThis = timer?.productId === productId && running;
  return (
    <button
      onClick={() => (isThis ? pause() : start(productId, productName))}
      aria-label={isThis ? `Pausar cronómetro de ${productName}` : `Iniciar cronómetro de ${productName}`}
      className={`flex size-12 items-center justify-center rounded-full ${
        isThis ? "bg-accent text-night" : "bg-sage text-on-sage"
      }`}
    >
      {isThis ? <IconPause size={20} /> : <IconPlay size={20} />}
    </button>
  );
}
