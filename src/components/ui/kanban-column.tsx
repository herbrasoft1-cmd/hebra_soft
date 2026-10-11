import type { ReactNode } from "react";

/** DESIGN.md §6: columna track radio 16. Lista para la Fase 3 (Producción); hoy sin datos reales. */
export function KanbanColumn({
  title,
  count,
  hours,
  children,
}: {
  title: string;
  count: number;
  hours?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex min-w-[260px] flex-1 flex-col gap-3 rounded-2xl bg-track p-3">
      <div className="flex items-baseline justify-between px-1">
        <h3 className="text-[13px] font-semibold text-ink-2">{title}</h3>
        <span className="text-[12px] text-muted">
          {count}
          {hours ? ` · ${hours}` : ""}
        </span>
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}
