"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Hoja inferior en celular / modal centrado en escritorio, sobre <dialog> nativo
 * (accesible: foco atrapado, Esc para cerrar).
 */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none rounded-t-[28px] bg-bg p-0 text-ink md:m-auto md:max-w-lg md:rounded-[28px]"
    >
      <div className="pb-safe flex flex-col gap-4 px-6 pt-4 md:pb-6">
        <div className="h-1.5 w-10 self-center rounded-full bg-line-strong md:hidden" />
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-[22px] font-semibold">{title}</h2>
          <button onClick={onClose} className="btn min-h-10 px-3 text-sm text-ink-2" aria-label="Cerrar">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
