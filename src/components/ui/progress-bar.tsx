type Tone = "primary" | "success" | "warning" | "danger";

const TONE: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
};

/** DESIGN.md §6: alto 5–8px, fondo track. */
export function ProgressBar({ value, max = 100, tone = "primary" }: { value: number; max?: number; tone?: Tone }) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-track">
      <div className={`h-full rounded-full ${TONE[tone]}`} style={{ width: `${pct}%` }} />
    </div>
  );
}
