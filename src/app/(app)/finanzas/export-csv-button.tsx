"use client";

import type { Transaction } from "@/lib/types";

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Exporta los movimientos del mes a CSV, listo para abrir en cualquier hoja de cálculo o
 * importar a un software de contabilidad (formato genérico, no uno propietario). */
export function ExportCsvButton({ rows, monthLabel }: { rows: Transaction[]; monthLabel: string }) {
  const download = () => {
    const header = ["Fecha", "Tipo", "Categoría", "Descripción", "Monto", "Método de pago"];
    const lines = rows.map((t) =>
      [t.occurred_on, t.type === "ingreso" ? "Ingreso" : "Gasto", t.category, t.description ?? "", String(t.amount), t.payment_method ?? ""]
        .map((v) => csvEscape(v))
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hebra-finanzas-${monthLabel.replace(/\s+/g, "-")}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <button type="button" onClick={download} className="btn-ghost min-h-10 px-4 text-sm">
      Exportar a contabilidad
    </button>
  );
}
