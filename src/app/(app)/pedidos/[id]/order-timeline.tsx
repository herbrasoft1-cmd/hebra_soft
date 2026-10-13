import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];

/** Línea de tiempo horizontal del pedido (Ent-Movil-Pedido.dc.html). `activePct`: % de avance
 * real del paso activo (ya calculado en la página con datos de cronómetro) — si se pasa, el nodo
 * activo crece y muestra el número en vez del punto genérico. */
export function OrderTimeline({
  status,
  statusLabels,
  activePct,
}: {
  status: OrderStatus;
  statusLabels: Record<OrderStatus, string>;
  activePct?: number | null;
}) {
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="grid grid-cols-4">
      {STEPS.map((s, i) => {
        const done = i < currentIdx || status === "enviado";
        const active = i === currentIdx && status !== "enviado";
        const showPct = active && activePct !== null && activePct !== undefined;
        return (
          <div key={s} className="relative flex flex-col items-center gap-1.5">
            {i > 0 && <span className={`absolute right-1/2 top-[5px] h-0.5 w-full ${done || active ? "bg-primary" : "bg-border"}`} />}
            {showPct ? (
              <span className="relative -mt-2 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-on-primary ring-4 ring-primary-soft">
                {activePct}%
              </span>
            ) : (
              <span
                className={`relative flex size-3 shrink-0 rounded-full ${
                  done ? "bg-primary" : active ? "bg-primary ring-4 ring-primary-soft" : "bg-border-strong"
                }`}
              />
            )}
            <span className={`text-center text-[11px] ${active ? "font-semibold text-ink" : "text-muted"}`}>{statusLabels[s]}</span>
          </div>
        );
      })}
    </div>
  );
}
