"use client";

import { IconPause, IconPlay, IconStop, ThreadLine } from "@/components/icons";
import { useTimer } from "@/components/timer";
import { clock, duration, UNIT_LABEL } from "@/lib/format";
import type { Product, Unit } from "@/lib/types";

export type ReadonlyLine = {
  id: string;
  quantity: number;
  supplies: { name: string; unit: Unit; lot_color: string | null } | null;
};

type Props = {
  product: Product;
  lines: ReadonlyLine[];
  itemLabel: string;
  timerLabel: string;
  activeVerb: string;
};

/**
 * Vista de solo lectura del patrón para quien no tiene permiso de "Editar recetario y
 * precios" (ventas, tejedora): sin costo, sin valor de la hora, sin precio sugerido, sin
 * controles de edición — pero con el cronómetro de talento completo, que sí les toca.
 */
export function RecipeViewer({ product, lines, itemLabel, timerLabel, activeVerb }: Props) {
  const { timer, elapsed, running, start, pause, resume, stop } = useTimer();
  const isThis = timer?.productId === product.id;
  const liveSeconds = product.labor_seconds + (isThis ? elapsed : 0);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <span className="chip self-start bg-success-soft text-success-ink">
            {itemLabel}
            {product.category ? ` · ${product.category}` : ""}
          </span>
          <h1 className="font-display text-[32px] leading-tight">{product.name}</h1>
          {product.notes && <p className="text-sm text-ink-2">{product.notes}</p>}
        </div>

        <section className="flex flex-col gap-3.5 rounded-[22px] bg-night p-5 text-on-night">
          <div className="flex items-center justify-between text-[13px] text-on-night-muted">
            <span>{timerLabel}</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="font-display text-[42px] tabular-nums tracking-wide">{clock(liveSeconds)}</span>
            <div className="flex gap-2">
              <button
                onClick={() => (isThis ? (running ? pause() : resume()) : start(product.id, product.name))}
                aria-label={isThis && running ? "Pausar cronómetro" : "Iniciar cronómetro"}
                className="flex size-15 cursor-pointer items-center justify-center rounded-full bg-accent text-night transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
              >
                {isThis && running ? <IconPause size={24} /> : <IconPlay size={24} />}
              </button>
              {isThis && (
                <button
                  onClick={() => stop()}
                  aria-label="Terminar sesión y guardar tiempo"
                  className="flex size-15 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-all duration-150 hover:bg-white/15 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                >
                  <IconStop size={20} />
                </button>
              )}
            </div>
          </div>
          <ThreadLine className="text-accent opacity-80" />
          <p className="text-[13px] text-on-night-muted">
            {isThis
              ? running
                ? `${activeVerb}… toca ■ para guardar la sesión.`
                : "En pausa. Toca ▶ para seguir o ■ para guardar."
              : `Tiempo acumulado: ${duration(product.labor_seconds)}. Toca ▶ cuando empieces.`}
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Insumos del {itemLabel.toLowerCase()}</h2>
          <div className="card flex flex-col">
            {lines.length === 0 && <p className="px-4 py-3 text-sm text-muted">Sin insumos registrados todavía.</p>}
            {lines.map((l) => {
              const u = l.supplies ? UNIT_LABEL[l.supplies.unit] : null;
              return (
                <div key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">
                      {l.supplies?.name}
                      {l.supplies?.lot_color ? ` · ${l.supplies.lot_color}` : ""}
                    </span>
                  </span>
                  <span className="text-sm text-muted">
                    {Number(l.quantity)} {u?.short ?? ""}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
