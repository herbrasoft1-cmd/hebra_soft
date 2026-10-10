"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/** Botón de envío que se deshabilita mientras la server action trabaja. */
export function SubmitButton({
  children,
  pendingText = "Guardando…",
  className = "btn-primary",
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className}>
      {pending ? pendingText : children}
    </button>
  );
}
