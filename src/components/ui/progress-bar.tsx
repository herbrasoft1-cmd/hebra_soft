type Tone = "primary" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** DESIGN.md §6: alto 5–8px, fondo track. `markerPct` pinta una línea vertical fija (ej. el
 * punto de reorden en Insumos) — opcional, no afecta a quien no la pasa. */
export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  markerPct,
}: {
  value: number;
  max?: number;
  tone?: Tone;
  markerPct?: number;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-track">
      <div className={`h-full rounded-full ${TONE[tone]}`} style={{ width: `${pct}%` }} />
      {markerPct !== undefined && (
        <div className="absolute top-0 h-full w-px bg-ink/40" style={{ left: `${Math.max(0, Math.min(100, markerPct))}%` }} />
      )}
    </div>
  );
}
