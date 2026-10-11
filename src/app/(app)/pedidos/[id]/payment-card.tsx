"use client";

import { useState } from "react";
import { IconWallet } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { money, whatsappLink } from "@/lib/format";
import { markPaid, registerOrderPayment } from "../actions";

/**
 * Saldo real (precio − Σ abonos registrados), sin pasarela de pago: el botón
 * de cobro abre WhatsApp con el monto, no procesa el pago (Fase 7, excluida).
 */
export function PaymentCard({
  orderId,
  title,
  total,
  balance,
  canManage,
  customerWhatsapp,
  customerName,
}: {
  orderId: string;
  title: string;
  total: number;
  balance: number;
  canManage: boolean;
  customerWhatsapp: string | null;
  customerName: string | null;
}) {
  const [showAbono, setShowAbono] = useState(false);
  const wa = whatsappLink(
    customerWhatsapp,
    `Hola ${customerName ?? ""}, tu saldo pendiente de "${title}" es ${money(balance)}. ¿Cómo prefieres pagarlo?`,
  );

  return (
    <section className="card flex flex-col gap-3 p-4">
      <div className="flex items-center gap-2">
        <IconWallet size={18} />
        <h2 className="font-display text-lg font-semibold">Pago</h2>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">Total del pedido</span>
        <span className="font-semibold tabular-nums">{money(total)}</span>
      </div>
      {total - balance > 0 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted">Abonado</span>
          <span className="tabular-nums text-success-ink">− {money(total - balance)}</span>
        </div>
      )}
      <div className="flex items-center justify-between border-t border-border pt-2.5 text-[15px] font-semibold">
        <span>{balance <= 0 ? "Pagado" : "Saldo pendiente"}</span>
        <span className={balance <= 0 ? "text-success-ink" : ""}>{money(balance)}</span>
      </div>

      {canManage && balance > 0 && (
        <>
          {wa && (
            <a href={wa} target="_blank" rel="noreferrer" className="btn-primary min-h-11 text-center text-sm">
              Enviar saldo por WhatsApp
            </a>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowAbono((v) => !v)} className="btn-ghost min-h-11 flex-1 text-sm">
              {showAbono ? "Cancelar" : "Registrar abono"}
            </button>
            <form action={markPaid} className="flex-1">
              <input type="hidden" name="id" value={orderId} />
              <input type="hidden" name="payment_method" value="Transferencia" />
              <SubmitButton className="btn-ghost min-h-11 w-full text-sm" pendingText="…">
                Marcar pagado del todo
              </SubmitButton>
            </form>
          </div>
          {showAbono && (
            <form
              action={async (fd) => {
                const amount = Number(fd.get("amount") ?? 0);
                const method = String(fd.get("payment_method") ?? "Transferencia");
                await registerOrderPayment(orderId, amount, method);
                setShowAbono(false);
              }}
              className="flex flex-col gap-2.5 rounded-xl bg-surface-muted p-3"
            >
              <label className="field">
                Monto del abono
                <input className="input" name="amount" type="number" min="1" step="any" max={balance} required />
              </label>
              <label className="field">
                Método
                <select className="input" name="payment_method" defaultValue="Transferencia">
                  <option>Transferencia</option>
                  <option>Efectivo</option>
                  <option>Nequi</option>
                  <option>Otro</option>
                </select>
              </label>
              <SubmitButton className="btn-primary" pendingText="Guardando…">
                Guardar abono
              </SubmitButton>
            </form>
          )}
        </>
      )}
    </section>
  );
}
