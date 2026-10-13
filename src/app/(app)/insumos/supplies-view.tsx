"use client";

import { useMemo, useState } from "react";
import { IconOvillo, IconPlus, IconTrash } from "@/components/icons";
import { type Column, DataTable } from "@/components/ui/data-table";
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

type SupplyRow = Supply & { location_name: string | null };

type Status = "agotado" | "reordenar" | "disponible";
const STATUS_LABEL: Record<Status, string> = { agotado: "Agotado", reordenar: "Reordenar", disponible: "Disponible" };
const STATUS_TONE: Record<Status, string> = {
  agotado: "bg-danger-soft text-danger-ink",
  reordenar: "bg-warning-soft text-warning-ink",
  disponible: "bg-success-soft text-success-ink",
};
function statusOf(s: SupplyRow): Status {
  if (Number(s.quantity_remaining) <= 0) return "agotado";
  if (Number(s.low_stock_threshold) > 0 && Number(s.quantity_remaining) <= Number(s.low_stock_threshold)) return "reordenar";
  return "disponible";
}

export function SuppliesView({
  canSeeCosts,
  showLocationColumn,
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
  canSeeCosts: boolean;
  showLocationColumn: boolean;
  supplies: SupplyRow[];
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
  const [editing, setEditing] = useState<SupplyRow | "new" | null>(null);

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
        {canSeeCosts && (
          <KpiCard label="Valor del inventario" value={compactMoney(inventoryValue)}>
            <span className="text-xs text-muted">{referencesCount} referencias en esta vista</span>
          </KpiCard>
        )}
        <KpiCard label="Bajo punto de reorden" value={String(belowReorderCount)}>
          <span className="text-xs text-muted">{outOfStockCount} agotados</span>
        </KpiCard>
        {canSeeCosts && (
          <KpiCard label="Órdenes de compra abiertas" value={String(openPOCount)}>
            <span className="text-xs text-muted">{money(openPOAmount)} por recibir</span>
          </KpiCard>
        )}
        <KpiCard label="Proveedores" value={String(suppliersCount)} />
      </div>

      <div className={`grid gap-5 ${canSeeCosts ? "lg:grid-cols-[minmax(0,1fr)_320px]" : ""}`}>
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
            {canSeeCosts && (
              <button className="btn-primary" onClick={() => setEditing("new")}>
                <IconPlus size={18} /> Registrar compra
              </button>
            )}
          </div>

          {canSeeCosts && (
            <div className="flex flex-col gap-2.5 rounded-[18px] bg-success-soft p-4">
              <span className="text-[13px] font-semibold text-success-ink">Así calcula HEBRA tu costo</span>
              <p className="text-sm text-ink-2">
                Registras lo que compraste (ej. 100 g por $15.000) y HEBRA guarda cuánto vale cada gramo ($150),
                promediado con lo que ya tenías. Así el recetario sabe el costo exacto de cada pieza.
              </p>
            </div>
          )}

          {supplies.length === 0 ? (
            <EmptyState
              icon={IconOvillo}
              title="Aún no tienes insumos"
              text={canSeeCosts ? "Empieza registrando tu última compra de lana o hilo." : "Todavía no hay insumos registrados."}
              action={
                canSeeCosts ? (
                  <button className="btn-primary" onClick={() => setEditing("new")}>
                    Registrar primer insumo
                  </button>
                ) : undefined
              }
            />
          ) : (
            <SuppliesTable supplies={filtered} canSeeCosts={canSeeCosts} showLocationColumn={showLocationColumn} onEdit={setEditing} />
          )}
        </div>

        {canSeeCosts && (
          <PurchaseOrdersPanel
            orders={openPurchaseOrders}
            suggestion={transferSuggestion}
            supplies={allSupplyOptions}
            suppliers={suppliers}
            locations={locations}
          />
        )}
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

/** Tabla por lote/sede, fiel a Ent-Inventario.dc.html: cada fila es un lote concreto en una sede
 * concreta (supplies ya es por-lote-por-sede desde la migración 0001, no hace falta agrupar). */
function SuppliesTable({
  supplies,
  canSeeCosts,
  showLocationColumn,
  onEdit,
}: {
  supplies: SupplyRow[];
  canSeeCosts: boolean;
  showLocationColumn: boolean;
  onEdit: (s: SupplyRow) => void;
}) {
  const columns: Column<SupplyRow>[] = [
    {
      key: "name",
      label: "Insumo",
      render: (s) =>
        canSeeCosts ? (
          <button type="button" onClick={() => onEdit(s)} className="flex items-center gap-2 text-left font-medium hover:underline">
            <IconOvillo size={16} className="shrink-0 text-primary" />
            {s.name}
          </button>
        ) : (
          <span className="flex items-center gap-2 font-medium">
            <IconOvillo size={16} className="shrink-0 text-primary" />
            {s.name}
          </span>
        ),
    },
    ...(showLocationColumn ? [{ key: "sede", label: "Sede", render: (s: SupplyRow) => s.location_name ?? "—" } as Column<SupplyRow>] : []),
    { key: "lote", label: "Lote", render: (s) => [s.brand, s.lot_color].filter(Boolean).join(" · ") || "—" },
    {
      key: "stock",
      label: "Stock vs. reorden",
      render: (s) => {
        const u = UNIT_LABEL[s.unit];
        const min = Number(s.low_stock_threshold);
        // Mismo criterio que el mockup: % sobre el doble del punto de reorden, con la línea
        // marcando el 50% (= el punto de reorden exacto). Sin umbral configurado, solo barra llena.
        const pct = min > 0 ? Math.min(100, (Number(s.quantity_remaining) / (min * 2)) * 100) : 100;
        const status = statusOf(s);
        return (
          <div className="flex min-w-32 flex-col gap-1">
            <span className="text-xs text-ink-2">
              {Number(s.quantity_remaining)} {u.short}
              {min > 0 ? ` · mín. ${min}` : ""}
            </span>
            <ProgressBar
              value={pct}
              tone={status === "agotado" ? "danger" : status === "reordenar" ? "warning" : "success"}
              markerPct={min > 0 ? 50 : undefined}
            />
          </div>
        );
      },
    },
    ...(canSeeCosts
      ? [{ key: "costo", label: "Costo u.", align: "right", render: (s: SupplyRow) => unitMoney(Number(s.unit_cost)) } as Column<SupplyRow>]
      : []),
    ...(canSeeCosts
      ? [
          {
            key: "valor",
            label: "Valor",
            align: "right",
            render: (s: SupplyRow) => money(Number(s.quantity_remaining) * Number(s.unit_cost)),
          } as Column<SupplyRow>,
        ]
      : []),
    {
      key: "estado",
      label: "Estado",
      render: (s) => {
        const status = statusOf(s);
        return <span className={`chip ${STATUS_TONE[status]}`}>{STATUS_LABEL[status]}</span>;
      },
    },
  ];

  return <DataTable columns={columns} rows={supplies} rowKey={(s) => s.id} />;
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
