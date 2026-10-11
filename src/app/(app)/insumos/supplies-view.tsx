"use client";

import { useMemo, useState } from "react";
import { IconOvillo, IconPlus, IconTrash } from "@/components/icons";
import { EmptyState } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { ProgressBar } from "@/components/ui/progress-bar";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { unitCost } from "@/lib/costing";
import type { TransferSuggestion } from "@/lib/inventory";
import { UNIT_LABEL, compactMoney, money, unitMoney } from "@/lib/format";
import type { Location, PurchaseOrder, Supplier, Supply, Unit } from "@/lib/types";
import { deleteSupply, saveSupply } from "./actions";
import { PurchaseOrdersPanel } from "./purchase-orders-panel";

export function SuppliesView({
  supplies,
  units,
  examples,
  suppliers,
  inventoryValue,
  referencesCount,
  belowReorderCount,
  outOfStockCount,
  openPOCount,
  openPOAmount,
  suppliersCount,
  openPurchaseOrders,
  transferSuggestion,
  allSupplyOptions,
  locations,
}: {
  supplies: Supply[];
  units: Unit[];
  examples: string;
  suppliers: Supplier[];
  inventoryValue: number;
  referencesCount: number;
  belowReorderCount: number;
  outOfStockCount: number;
  openPOCount: number;
  openPOAmount: number;
  suppliersCount: number;
  openPurchaseOrders: PurchaseOrder[];
  transferSuggestion: TransferSuggestion;
  allSupplyOptions: { id: string; name: string; unit: string; locationName: string }[];
  locations: Location[];
}) {
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Supply | "new" | null>(null);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return supplies;
    return supplies.filter((s) =>
      [s.name, s.brand, s.lot_color].some((v) => v?.toLowerCase().includes(term)),
    );
  }, [q, supplies]);

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <KpiCard label="Valor del inventario" value={compactMoney(inventoryValue)}>
          <span className="text-xs text-muted">{referencesCount} referencias en esta vista</span>
        </KpiCard>
        <KpiCard label="Bajo punto de reorden" value={String(belowReorderCount)}>
          <span className="text-xs text-muted">{outOfStockCount} agotados</span>
        </KpiCard>
        <KpiCard label="Órdenes de compra abiertas" value={String(openPOCount)}>
          <span className="text-xs text-muted">{money(openPOAmount)} por recibir</span>
        </KpiCard>
        <KpiCard label="Proveedores" value={String(suppliersCount)} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-end gap-3">
            <label className="field min-w-56 flex-1">
              Buscar insumo
              <input
                type="search"
                className="input"
                placeholder={examples}
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </label>
            <button className="btn-primary" onClick={() => setEditing("new")}>
              <IconPlus size={18} /> Nueva compra
            </button>
          </div>

          <div className="flex flex-col gap-2.5 rounded-[18px] bg-success-soft p-4">
            <span className="text-[13px] font-semibold text-success-ink">Así calcula HEBRA tu costo</span>
            <p className="text-sm text-ink-2">
              Registras lo que compraste (ej. 100 g por $15.000) y HEBRA guarda cuánto vale cada gramo ($150),
              promediado con lo que ya tenías. Así el recetario sabe el costo exacto de cada pieza.
            </p>
          </div>

          {supplies.length === 0 ? (
            <EmptyState
              icon={IconOvillo}
              title="Aún no tienes insumos"
              text="Empieza registrando tu última compra de lana o hilo."
              action={
                <button className="btn-primary" onClick={() => setEditing("new")}>
                  Registrar primer insumo
                </button>
              }
            />
          ) : (
            <ul className="grid gap-2.5 md:grid-cols-2">
              {filtered.map((s) => {
                const ratio = s.quantity_purchased > 0 ? s.quantity_remaining / s.quantity_purchased : 0;
                const low =
                  s.low_stock_threshold > 0 ? s.quantity_remaining <= s.low_stock_threshold : ratio < 0.4;
                const u = UNIT_LABEL[s.unit];
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setEditing(s)}
                      className="card flex w-full flex-col gap-2.5 px-4 py-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-border-strong"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                          <IconOvillo size={20} />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-[15px] font-semibold">{s.name}</span>
                          <span className="truncate text-xs text-muted">
                            {[s.brand, s.lot_color].filter(Boolean).join(" · ") || "Sin marca"}
                          </span>
                        </span>
                        <span className="flex flex-col items-end">
                          <span className="text-[15px] font-semibold tabular-nums">{unitMoney(Number(s.unit_cost))}</span>
                          <span className="text-[11px] text-muted">por {u.long}</span>
                        </span>
                      </div>
                      <ProgressBar value={Math.round(ratio * 100)} tone={low ? "warning" : "success"} />
                      <div className="flex justify-between text-xs text-ink-2">
                        <span>
                          Quedan {Number(s.quantity_remaining)} {u.short}
                          {low && <strong className="ml-1 text-primary-hover">· por agotarse</strong>}
                        </span>
                        <span>
                          Compra: {Number(s.quantity_purchased)} {u.short} · {money(s.total_cost)}
                        </span>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <PurchaseOrdersPanel
          orders={openPurchaseOrders}
          suggestion={transferSuggestion}
          supplies={allSupplyOptions}
          suppliers={suppliers}
          locations={locations}
        />
      </div>

      <Sheet
        open={editing !== null}
        onClose={() => setEditing(null)}
        title={editing === "new" ? "Nueva compra de insumo" : "Editar insumo"}
      >
        {editing !== null && (
          <SupplyForm
            key={editing === "new" ? "new" : editing.id}
            supply={editing === "new" ? null : editing}
            units={units}
            suppliers={suppliers}
            onDone={() => setEditing(null)}
          />
        )}
      </Sheet>
    </div>
  );
}

function SupplyForm({
  supply,
  units,
  suppliers,
  onDone,
}: {
  supply: Supply | null;
  units: Unit[];
  suppliers: Supplier[];
  onDone: () => void;
}) {
  const [qty, setQty] = useState(String(supply?.quantity_purchased ?? ""));
  const [cost, setCost] = useState(String(supply?.total_cost ?? ""));
  const [unit, setUnit] = useState<Unit>(supply?.unit ?? units[0] ?? "g");
  const perUnit = unitCost(Number(cost) || 0, Number(qty) || 0);
  const allUnits: Unit[] = Array.from(new Set([...units, "g", "m", "u", "ml"] as Unit[]));

  return (
    <div className="flex flex-col gap-4">
      <form
        action={async (fd) => {
          await saveSupply(fd);
          onDone();
        }}
        className="flex flex-col gap-3.5"
      >
        {supply && <input type="hidden" name="id" value={supply.id} />}
        <label className="field">
          Nombre del insumo
          <input className="input" name="name" defaultValue={supply?.name} placeholder="Lana café" required />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="field">
            Marca
            <input className="input" name="brand" defaultValue={supply?.brand ?? ""} />
          </label>
          <label className="field">
            Lote / color
            <input className="input" name="lot_color" defaultValue={supply?.lot_color ?? ""} />
          </label>
        </div>
        {suppliers.length > 0 && (
          <label className="field">
            Proveedor
            <select className="input" name="supplier_id" defaultValue={supply?.supplier_id ?? ""}>
              <option value="">Sin especificar</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <label className="field">
            Cantidad comprada
            <input
              className="input"
              name="quantity_purchased"
              type="number"
              inputMode="decimal"
              min="0.01"
              step="any"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              required
            />
          </label>
          <label className="field">
            Unidad
            <select className="input" name="unit" value={unit} onChange={(e) => setUnit(e.target.value as Unit)}>
              {allUnits.map((u) => (
                <option key={u} value={u}>
                  {UNIT_LABEL[u].long}s ({u})
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="field">
          Costo total de la compra (COP)
          <input
            className="input"
            name="total_cost"
            type="number"
            inputMode="numeric"
            min="0"
            step="any"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            required
          />
        </label>
        {supply && (
          <label className="field">
            Cantidad que te queda
            <input
              className="input"
              name="quantity_remaining"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              defaultValue={supply.quantity_remaining}
            />
          </label>
        )}
        <label className="field">
          Avisarme cuando queden menos de ({unit})
          <input
            className="input"
            name="low_stock_threshold"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            defaultValue={supply?.low_stock_threshold || ""}
          />
        </label>

        <div className="flex items-center justify-between rounded-xl bg-success-soft px-4 py-3">
          <span className="text-sm text-success-ink">Cada {UNIT_LABEL[unit].long} te cuesta</span>
          <span className="font-display text-2xl font-semibold text-success-ink">{unitMoney(perUnit)}</span>
        </div>

        <SubmitButton>{supply ? "Guardar cambios" : "Guardar insumo"}</SubmitButton>
      </form>

      {supply && (
        <form
          action={async (fd) => {
            const res = await deleteSupply(fd);
            if (res.error) alert(res.error);
            else onDone();
          }}
        >
          <input type="hidden" name="id" value={supply.id} />
          <SubmitButton className="btn w-full text-primary-hover" pendingText="Eliminando…">
            <IconTrash size={18} /> Eliminar insumo
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
