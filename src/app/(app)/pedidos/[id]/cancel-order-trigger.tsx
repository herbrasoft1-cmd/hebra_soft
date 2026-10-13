"use client";

import { useState } from "react";
import { IconDots } from "@/components/icons";
import { CancelOrderSheet } from "../cancel-order-sheet";

/** `variant="icon"`: botón "⋯" compacto para el encabezado (mockup Movil-Pedido: acciones
 * secundarias agrupadas, no un tercer botón apilado al fondo). `variant="full"` (por defecto)
 * mantiene el botón de texto completo, por si se reutiliza en otro lugar más adelante. */
export function CancelOrderTrigger({
  orderId,
  orderTitle,
  variant = "full",
}: {
  orderId: string;
  orderTitle: string;
  variant?: "full" | "icon";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      {variant === "icon" ? (
        <button type="button" onClick={() => setOpen(true)} aria-label="Más opciones" className="icon-btn size-10 border border-border-strong">
          <IconDots size={16} />
        </button>
      ) : (
        <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-11 w-full text-sm text-primary-hover">
          Cancelar pedido
        </button>
      )}
      <CancelOrderSheet orderId={orderId} orderTitle={orderTitle} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
