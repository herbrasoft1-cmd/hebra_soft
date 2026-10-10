"use client";

import { useState } from "react";
import { addTransaction } from "@/app/(app)/caja/actions";
import { Sheet } from "./sheet";
import { SubmitButton } from "./submit-button";

const INCOME_CATEGORIES = ["Venta", "Anticipo", "Otro ingreso"];
const EXPENSE_CATEGORIES = ["Materiales", "Publicidad", "Internet", "Suscripciones", "Envíos", "Otro gasto"];
const METHODS = ["Efectivo", "Transferencia", "Nequi", "Daviplata", "Tarjeta"];

/** Registro rápido de venta o gasto en una hoja inferior. */
export function QuickTransactionSheet({
  open,
  onClose,
  type = "ingreso",
}: {
  open: boolean;
  onClose: () => void;
  type?: "ingreso" | "gasto";
}) {
  const [kind, setKind] = useState<"ingreso" | "gasto">(type);
  const [error, setError] = useState<string | null>(null);
  const cats = kind === "ingreso" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <Sheet open={open} onClose={onClose} title={kind === "ingreso" ? "Registrar venta" : "Registrar gasto"}>
      <form
        action={async (fd) => {
          const res = await addTransaction(fd);
          if (res.ok) onClose();
          else setError(res.error ?? "No se pudo guardar.");
        }}
        className="flex flex-col gap-3.5"
      >
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de movimiento">
          {(["ingreso", "gasto"] as const).map((k) => (
            <label
              key={k}
              className={`btn min-h-11 text-sm ${
                kind === k ? "border-2 border-primary bg-primary-soft text-primary-ink" : "border border-line-strong"
              }`}
            >
              <input
                type="radio"
                name="type"
                value={k}
                checked={kind === k}
                onChange={() => setKind(k)}
                className="sr-only"
              />
              {k === "ingreso" ? "Venta / ingreso" : "Gasto"}
            </label>
          ))}
        </div>
        <label className="field">
          Valor (COP)
          <input className="input text-2xl" name="amount" type="number" inputMode="numeric" min="1" required autoFocus />
        </label>
        <label className="field">
          ¿De qué fue?
          <input className="input" name="description" placeholder={kind === "ingreso" ? "Osito café" : "Lana x5"} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Categoría
            <select className="input" name="category" key={kind}>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="field">
            Método
            <select className="input" name="payment_method">
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
        </div>
        {error && <p className="text-sm text-primary-ink">{error}</p>}
        <SubmitButton>{kind === "ingreso" ? "Guardar venta" : "Guardar gasto"}</SubmitButton>
      </form>
    </Sheet>
  );
}
