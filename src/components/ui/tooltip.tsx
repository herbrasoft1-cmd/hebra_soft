import type { ReactNode } from "react";

const SIDE = {
  right: "left-full top-1/2 ml-2 -translate-y-1/2",
  top: "bottom-full left-1/2 mb-2 -translate-x-1/2",
  bottom: "top-full left-1/2 mt-2 -translate-x-1/2",
} as const;

/** Tooltip accesible en CSS puro (sin JS): aparece con hover y con foco de teclado. */
export function Tooltip({
  label,
  side = "right",
  full = false,
  children,
}: {
  label: string;
  side?: keyof typeof SIDE;
  /** true: el envoltorio ocupa todo el ancho disponible (para filas/bloques, no solo íconos). */
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`group/tooltip relative ${full ? "flex w-full" : "inline-flex"}`}>
      {children}
      <span
        role="tooltip"
        className={`pointer-events-none absolute z-50 whitespace-nowrap rounded-md bg-night px-2.5 py-1.5 text-[12px] font-medium text-on-night opacity-0 shadow-lg transition-opacity delay-300 duration-150 group-hover/tooltip:opacity-100 group-focus-within/tooltip:opacity-100 ${SIDE[side]}`}
      >
        {label}
      </span>
    </span>
  );
}
