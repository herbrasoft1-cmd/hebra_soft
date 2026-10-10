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
      className={`flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full shadow-sm transition-all duration-150 hover:shadow-md hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 ${
        isThis ? "bg-accent text-night" : "bg-sage text-on-sage"
      }`}
    >
      {isThis ? <IconPause size={20} /> : <IconPlay size={20} />}
    </button>
  );
}
