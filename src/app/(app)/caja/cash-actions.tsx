"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { QuickTransactionSheet } from "@/components/quick-transaction";

export function CashActions() {
  const [open, setOpen] = useState<"ingreso" | "gasto" | null>(null);
  return (
    <div className="flex gap-2">
      <button className="btn-ghost" onClick={() => setOpen("gasto")}>
        Gasto
      </button>
      <button className="btn-primary" onClick={() => setOpen("ingreso")}>
        <IconPlus size={18} /> Venta
      </button>
      {open && <QuickTransactionSheet key={open} open onClose={() => setOpen(null)} type={open} />}
    </div>
  );
}
