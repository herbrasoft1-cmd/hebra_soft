"use client";

import { useState, useTransition } from "react";
import type { TransferSuggestion } from "@/lib/inventory";
import { money } from "@/lib/format";
import { SubmitButton } from "@/components/submit-button";
import type { Location, PurchaseOrder, PurchaseOrderStatus, Supplier } from "@/lib/types";
import { advancePurchaseOrder, createPurchaseOrder, createSupplier, createTransfer } from "./actions";

const STATUS_LABEL: Record<PurchaseOrderStatus, string> = {
  borrador: "Borrador",
  por_aprobar: "Por aprobar",
  en_transito: "En tránsito",
  recibida: "Recibida",
};
const STATUS_TONE: Record<PurchaseOrderStatus, string> = {
  borrador: "bg-surface-muted text-ink-2",
  por_aprobar: "bg-warning-soft text-warning-ink",
  en_transito: "bg-success-soft text-success-ink",
  recibida: "bg-surface-muted text-ink-2",
};
const NEXT_STATUS: Record<PurchaseOrderStatus, PurchaseOrderStatus | null> = {
  borrador: "por_aprobar",
  por_aprobar: "en_transito",
  en_transito: "recibida",
  recibida: null,
};
const NEXT_LABEL: Record<PurchaseOrderStatus, string | null> = {
  borrador: "Enviar a aprobar",
  por_aprobar: "Aprobar",
  en_transito: "Marcar recibida",
  recibida: null,
};

type SupplyOpt = { id: string; name: string; unit: string; locationName: string };

export function PurchaseOrdersPanel({
  orders,
  suggestion,
  supplies,
  suppliers,
  locations,
}: {
  orders: PurchaseOrder[];
  suggestion: TransferSuggestion;
  supplies: SupplyOpt[];
  suppliers: Supplier[];
  locations: Location[];
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);
  const [showNewPO, setShowNewPO] = useState(false);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showNewSupplier, setShowNewSupplier] = useState(false);
  const [, startTransition] = useTransition();

  const advance = (po: PurchaseOrder) => {
    const next = NEXT_STATUS[po.status];
    if (!next || busyId) return;
    setBusyId(po.id);
    startTransition(async () => {
      try {
        await advancePurchaseOrder(po.id, next);
      } catch (e) {
        alert(e instanceof Error ? e.message : "No se pudo avanzar la orden de compra.");
      } finally {
        setBusyId(null);
      }
    });
  };

  const applySuggestion = () => {
    if (!suggestion || applying) return;
    setApplying(true);
    startTransition(async () => {
      try {
        await createTransfer(suggestion.fromSupplyId, suggestion.toLocationId, suggestion.quantity);
      } catch (e) {
        alert(e instanceof Error ? e.message : "No se pudo crear la transferencia.");
      } finally {
        setApplying(false);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <section className="card flex flex-col gap-3.5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Proveedores</h2>
          <button type="button" onClick={() => setShowNewSupplier((v) => !v)} className="text-[13px] font-medium text-primary hover:text-primary-hover">
            {showNewSupplier ? "Cancelar" : "+ Nuevo"}
          </button>
        </div>

        {showNewSupplier && (
          <form
            action={async (fd) => {
              await createSupplier(fd);
              setShowNewSupplier(false);
            }}
            className="flex flex-col gap-2.5 rounded-xl bg-surface-muted p-3"
          >
            <label className="field">
              Nombre
              <input className="input" name="name" placeholder="Lanas del Valle" required />
            </label>
            <label className="field">
              Contacto
              <input className="input" name="contact" placeholder="WhatsApp, email…" />
            </label>
            <SubmitButton className="btn-primary" pendingText="Creando…">
              Agregar proveedor
            </SubmitButton>
          </form>
        )}

        {suppliers.length === 0 ? (
          <p className="text-sm text-muted">No tienes proveedores registrados.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {suppliers.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="font-medium">{s.name}</span>
                {s.contact && <span className="text-xs text-muted">{s.contact}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card flex flex-col gap-3.5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Órdenes de compra</h2>
          <button type="button" onClick={() => setShowNewPO((v) => !v)} className="text-[13px] font-medium text-primary hover:text-primary-hover">
            {showNewPO ? "Cancelar" : "+ Nueva"}
          </button>
        </div>

        {showNewPO && (
          <form
            action={async (fd) => {
              await createPurchaseOrder(fd);
              setShowNewPO(false);
            }}
            className="flex flex-col gap-2.5 rounded-xl bg-surface-muted p-3"
          >
            <label className="field">
              Insumo
              <select className="input" name="supply_id" required>
                <option value="">Elige un insumo…</option>
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.locationName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Proveedor
              <select className="input" name="supplier_id">
                <option value="">Sin especificar</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <label className="field">
                Cantidad
                <input className="input" name="quantity" type="number" min="0.01" step="any" required />
              </label>
              <label className="field">
                Costo unitario
                <input className="input" name="unit_cost" type="number" min="0" step="any" required />
              </label>
            </div>
            <SubmitButton className="btn-primary" pendingText="Creando…">
              Crear orden en borrador
            </SubmitButton>
          </form>
        )}

        {orders.length === 0 ? (
          <p className="text-sm text-muted">No hay órdenes de compra abiertas.</p>
        ) : (
          <div className="flex flex-col gap-2.5">
            {orders.map((po) => {
              const total = (po.purchase_order_lines ?? []).reduce((s, l) => s + Number(l.quantity) * Number(l.unit_cost), 0);
              const lineLabel = (po.purchase_order_lines ?? [])
                .map((l) => l.supplies?.name)
                .filter(Boolean)
                .join(", ");
              const next = NEXT_STATUS[po.status];
              return (
                <div key={po.id} className="rounded-xl border border-border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs text-muted">#{po.id.slice(0, 6).toUpperCase()}</span>
                    <span className={`chip ${STATUS_TONE[po.status]}`}>{STATUS_LABEL[po.status]}</span>
                  </div>
                  <p className="mt-1 font-medium">
                    {po.suppliers?.name ?? "Sin proveedor"} · {lineLabel || "—"}
                  </p>
                  <p className="text-xs text-muted">
                    {po.locations?.name ?? "Sin sede"} · {money(total)}
                    {po.auto_created && " · creada por reorden automático"}
                  </p>
                  {next && (
                    <button
                      onClick={() => advance(po)}
                      disabled={busyId === po.id}
                      className="btn-ghost mt-2.5 min-h-9 w-full text-xs"
                    >
                      {busyId === po.id ? "…" : NEXT_LABEL[po.status]}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="card flex flex-col gap-3.5 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Transferir entre sedes</h2>
          <button type="button" onClick={() => setShowTransfer((v) => !v)} className="text-[13px] font-medium text-primary hover:text-primary-hover">
            {showTransfer ? "Cancelar" : "+ Nueva"}
          </button>
        </div>
        {showTransfer && (
          <form
            action={async (fd) => {
              const fromSupplyId = String(fd.get("from_supply_id") ?? "");
              const toLocationId = String(fd.get("to_location_id") ?? "");
              const quantity = Number(fd.get("quantity") ?? 0);
              await createTransfer(fromSupplyId, toLocationId, quantity);
              setShowTransfer(false);
            }}
            className="flex flex-col gap-2.5 rounded-xl bg-surface-muted p-3"
          >
            <label className="field">
              Insumo de origen
              <select className="input" name="from_supply_id" required>
                <option value="">Elige un insumo…</option>
                {supplies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} · {s.locationName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Sede destino
              <select className="input" name="to_location_id" required>
                <option value="">Elige una sede…</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              Cantidad
              <input className="input" name="quantity" type="number" min="0.01" step="any" required />
            </label>
            <SubmitButton className="btn-primary" pendingText="Transfiriendo…">
              Transferir
            </SubmitButton>
          </form>
        )}
      </section>

      {suggestion && (
        <div className="flex flex-col gap-2.5 rounded-2xl bg-night p-5 text-on-night">
          <span className="text-[13px] font-semibold text-accent-light">Transferencia sugerida</span>
          <p className="text-sm">
            {suggestion.fromLocationName} tiene excedente de {suggestion.supplyName}. Enviar {suggestion.quantity} a{" "}
            {suggestion.toLocationName} desbloquea el pedido <strong>{suggestion.orderTitle}</strong>.
          </p>
          <button onClick={applySuggestion} disabled={applying} className="btn bg-accent-light text-ink hover:brightness-95">
            {applying ? "Creando…" : "Crear transferencia"}
          </button>
        </div>
      )}
    </div>
  );
}
