"use client";

import { useState } from "react";
import { createRemission } from "@/app/(app)/caja/actions";
import { buildRemissionPdf, shareOrDownload } from "@/lib/remission-pdf";
import { IconDoc } from "./icons";
import { Sheet } from "./sheet";

const METHODS = ["Transferencia", "Nequi", "Daviplata", "Efectivo", "Tarjeta"];

/** Botón "Generar remisión": elige método de pago → PDF → compartir por WhatsApp. */
export function RemissionButton({ orderId, className = "btn-ghost" }: { orderId: string; className?: string }) {
  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState(METHODS[0]!);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setBusy(true);
    setError(null);
    const res = await createRemission(orderId, method);
    if ("error" in res) {
      setError(res.error ?? "Error");
      setBusy(false);
      return;
    }
    const blob = await buildRemissionPdf({ ...res, date: new Date(res.createdAt) });
    const name = `remision-${String(res.number).padStart(4, "0")}.pdf`;
    await shareOrDownload(blob, name, `Remisión N.º ${res.number} de ${res.business.name}`);
    setBusy(false);
    setOpen(false);
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        <IconDoc size={18} /> Remisión
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Generar remisión">
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm text-ink-2">Método de pago</legend>
          <div className="flex flex-wrap gap-2">
            {METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={m === method}
                onClick={() => setMethod(m)}
                className={`btn min-h-11 px-4 text-sm ${
                  m === method ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-line-strong"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </fieldset>
        {error && <p className="text-sm text-primary-ink">{error}</p>}
        <button onClick={generate} disabled={busy} className="btn-primary">
          {busy ? "Generando…" : "Crear PDF y compartir"}
        </button>
        <p className="text-xs text-muted">
          En el celular se abre el menú para enviarla por WhatsApp. En el computador se descarga.
        </p>
      </Sheet>
    </>
  );
}
