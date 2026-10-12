"use client";

import { useState } from "react";
import { CancelOrderSheet } from "../cancel-order-sheet";

export function CancelOrderTrigger({ orderId, orderTitle }: { orderId: string; orderTitle: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost min-h-11 w-full text-sm text-primary-hover">
        Cancelar pedido
      </button>
      <CancelOrderSheet orderId={orderId} orderTitle={orderTitle} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
