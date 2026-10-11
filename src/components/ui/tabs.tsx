"use client";

/** DESIGN.md §6: subrayado 2px primary en la pestaña activa. */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="tablist" className="flex gap-6 border-b border-border">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`-mb-px border-b-2 px-1 pb-3 text-[14px] font-medium transition-colors ${
              active ? "border-primary text-ink" : "border-transparent text-muted hover:text-ink-2"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
