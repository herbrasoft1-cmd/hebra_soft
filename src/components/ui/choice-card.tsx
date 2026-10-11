"use client";

import type { ReactNode } from "react";

/** DESIGN.md §6: seleccionado = borde 2px primary + primary-soft. Lista para la Fase 4 (canal de venta). */
export function ChoiceCard({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-[10px] border px-4 py-3 text-left text-[14px] transition-colors ${
        selected ? "border-2 border-primary bg-primary-soft" : "border-border-strong bg-surface hover:bg-surface-muted"
      }`}
    >
      {children}
    </button>
  );
}
