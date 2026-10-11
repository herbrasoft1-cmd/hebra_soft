import type { ReactNode } from "react";

/** DESIGN.md §6: etiqueta 13px muted, chip de variación, cifra Fraunces, sparkline/barra opcional. */
export function KpiCard({
  label,
  value,
  delta,
  children,
}: {
  label: string;
  value: string;
  delta?: { text: string; positive: boolean };
  children?: ReactNode;
}) {
  return (
    <div className="card flex flex-col gap-2 p-5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] text-muted">{label}</span>
        {delta && (
          <span
            className={`chip text-[11px] ${delta.positive ? "bg-success-soft text-success-ink" : "bg-danger-soft text-danger-ink"}`}
          >
            {delta.positive ? "▲" : "▼"} {delta.text}
          </span>
        )}
      </div>
      <span className="font-display text-[28px] font-medium tabular-nums">{value}</span>
      {children}
    </div>
  );
}
