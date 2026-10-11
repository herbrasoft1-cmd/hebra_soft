"use client";

/** DESIGN.md §6: fondo surface-muted, padding 3px, pestaña activa blanca con sombra mínima. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="inline-flex rounded-[10px] bg-surface-muted p-[3px]">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`rounded-[8px] px-3 py-1.5 text-[13px] font-medium transition-colors ${
              active ? "bg-surface text-ink" : "text-muted hover:text-ink-2"
            }`}
            style={active ? { boxShadow: "var(--shadow-tab)" } : undefined}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
