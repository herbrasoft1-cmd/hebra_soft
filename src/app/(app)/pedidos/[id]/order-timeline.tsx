import type { OrderStatus } from "@/lib/types";

const STEPS: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];

/** Línea de tiempo horizontal del pedido (Ent-Movil-Pedido.dc.html). */
export function OrderTimeline({ status, statusLabels }: { status: OrderStatus; statusLabels: Record<OrderStatus, string> }) {
  const currentIdx = STEPS.indexOf(status);
  return (
    <div className="grid grid-cols-4">
      {STEPS.map((s, i) => {
        const done = i < currentIdx || status === "enviado";
        const active = i === currentIdx && status !== "enviado";
        return (
          <div key={s} className="relative flex flex-col items-center gap-1.5">
            {i > 0 && <span className={`absolute right-1/2 top-[5px] h-0.5 w-full ${done || active ? "bg-primary" : "bg-border"}`} />}
            <span
              className={`relative flex size-3 shrink-0 rounded-full ${
                done ? "bg-primary" : active ? "bg-primary ring-4 ring-primary-soft" : "bg-border-strong"
              }`}
            />
            <span className={`text-center text-[11px] ${active ? "font-semibold text-ink" : "text-muted"}`}>{statusLabels[s]}</span>
          </div>
        );
      })}
    </div>
  );
}
