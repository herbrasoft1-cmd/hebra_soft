"use client";

/** DESIGN.md §6: pista 40×22, perilla 16px; activo primary, inactivo #D9CFC2; aria-pressed. */
export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex h-[22px] w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
      style={{ background: checked ? "var(--color-primary)" : "#D9CFC2" }}
    >
      <span
        className="inline-block size-4 rounded-full bg-white transition-transform"
        style={{ transform: checked ? "translateX(20px)" : "translateX(4px)" }}
      />
    </button>
  );
}
