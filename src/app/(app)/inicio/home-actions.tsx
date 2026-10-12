"use client";

import Link from "next/link";
import { useState } from "react";
import { IconPause, IconPlay, IconPlus } from "@/components/icons";
import { QuickTransactionSheet } from "@/components/quick-transaction";
import { useTimer } from "@/components/timer";
import { clock } from "@/lib/format";

/** Filosofía "un clic": registrar venta o iniciar el cronómetro desde Inicio. */
export function HomeActions({
  lastProduct,
  openSale,
  timerVerb,
  canUseTimer,
}: {
  lastProduct: { id: string; name: string } | null;
  openSale: boolean;
  timerVerb: string;
  canUseTimer: boolean;
}) {
  const [saleOpen, setSaleOpen] = useState(openSale);
  const { timer, elapsed, running, start, pause, resume } = useTimer();

  const timerTarget = timer ?? (lastProduct ? { productId: lastProduct.id, productName: lastProduct.name } : null);

  const onTimer = () => {
    if (timer) return running ? pause() : resume();
    if (lastProduct) start(lastProduct.id, lastProduct.name);
  };

  return (
    <div className={`grid gap-3 md:max-w-2xl ${canUseTimer ? "grid-cols-2" : "grid-cols-1"}`}>
      <button
        onClick={() => setSaleOpen(true)}
        className="flex min-h-29 flex-col items-start justify-between rounded-[20px] bg-primary p-4 text-left text-on-primary active:scale-[0.98]"
      >
        <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
          <IconPlus size={20} />
        </span>
        <span className="text-base font-semibold">Registrar venta</span>
      </button>

      {canUseTimer && timerTarget ? (
        <button
          onClick={onTimer}
          className="flex min-h-29 flex-col items-start justify-between rounded-[20px] bg-success p-4 text-left text-on-primary active:scale-[0.98]"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
            {timer && running ? <IconPause size={18} /> : <IconPlay size={18} />}
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">
              {timer ? (running ? clock(elapsed) : "Continuar") : "Iniciar cronómetro"}
            </span>
            <span className="truncate text-[13px] opacity-90">{timerTarget.productName}</span>
          </span>
        </button>
      ) : canUseTimer ? (
        <Link
          href="/recetario"
          className="flex min-h-29 flex-col items-start justify-between rounded-[20px] bg-success p-4 text-on-primary"
        >
          <span className="flex size-9 items-center justify-center rounded-full bg-white/20">
            <IconPlay size={18} />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-semibold">{timerVerb}</span>
            <span className="text-[13px] opacity-90">Crea tu primer patrón</span>
          </span>
        </Link>
      ) : null}

      {saleOpen && <QuickTransactionSheet open onClose={() => setSaleOpen(false)} />}
    </div>
  );
}
