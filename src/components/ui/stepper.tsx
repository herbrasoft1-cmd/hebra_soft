"use client";

/** DESIGN.md §6: botones −/+ de 40px sobre bg. Lista para la Fase 4 (Simulador). */
export function Stepper({
  value,
  onChange,
  step = 1,
  min,
  max,
  format,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  format?: (v: number) => string;
}) {
  const dec = () => onChange(Math.max(min ?? -Infinity, value - step));
  const inc = () => onChange(Math.min(max ?? Infinity, value + step));
  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={dec} className="icon-btn size-10 border border-border-strong bg-bg" aria-label="Disminuir">
        −
      </button>
      <span className="min-w-16 text-center text-[14px] font-medium tabular-nums">{format ? format(value) : value}</span>
      <button type="button" onClick={inc} className="icon-btn size-10 border border-border-strong bg-bg" aria-label="Aumentar">
        +
      </button>
    </div>
  );
}
