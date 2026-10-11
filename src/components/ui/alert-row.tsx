type Tone = "danger" | "warning";

const BG: Record<Tone, string> = {
  danger: "bg-danger-tint border-danger-tint-border",
  warning: "bg-warning-tint border-warning-tint-border",
};
const DOT: Record<Tone, string> = {
  danger: "bg-danger",
  warning: "bg-warning",
};

/** DESIGN.md §6: punto de estado 8px + título 600 + detalle 13px sobre danger-tint/warning-tint. */
export function AlertRow({ tone, title, detail }: { tone: Tone; title: string; detail: string }) {
  return (
    <div className={`flex items-start gap-3 rounded-xl border p-3 ${BG[tone]}`}>
      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT[tone]}`} />
      <div className="flex flex-col gap-0.5">
        <span className="text-[14px] font-semibold text-ink">{title}</span>
        <span className="text-[13px] text-ink-2">{detail}</span>
      </div>
    </div>
  );
}
