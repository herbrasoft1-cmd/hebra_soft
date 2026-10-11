type Variant = "success" | "warning" | "danger" | "neutral" | "dark";

const STYLES: Record<Variant, string> = {
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
  neutral: "bg-surface-muted text-ink-2",
  dark: "bg-night text-on-night",
};

/** DESIGN.md §6: variantes success/warning/danger/neutral/dark, 11–12px/600. */
export function StatusChip({ children, variant = "neutral" }: { children: React.ReactNode; variant?: Variant }) {
  return <span className={`chip text-[11px] ${STYLES[variant]}`}>{children}</span>;
}
