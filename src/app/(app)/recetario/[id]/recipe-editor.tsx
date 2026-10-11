"use client";

import { useRef, useState } from "react";
import { IconOvillo, IconPause, IconPlay, IconStop, IconTrash, ThreadLine } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { useTimer } from "@/components/timer";
import { averageSecondsPerPiece, costBreakdown } from "@/lib/costing";
import { UNIT_LABEL, clock, duration, money, unitMoney } from "@/lib/format";
import type { Membership, Product, ProductStep, ProductSupply, ProductVersion, SalesChannel, Supply } from "@/lib/types";
import { addProductStep, deleteProduct, removeProductStep, removeRecipeLine, updateProduct, upsertRecipeLine } from "../actions";
import { CostingSimulator } from "./costing-simulator";

type Props = {
  product: Product;
  lines: ProductSupply[];
  supplies: Supply[];
  hourlyRate: number;
  toolWearPct: number;
  itemLabel: string;
  timerLabel: string;
  activeVerb: string;
  channels: SalesChannel[];
  versions: ProductVersion[];
  members: Membership[];
  soldLast90Days: number;
  timerSessions: { user_id: string; order_id: string | null; seconds: number }[];
  steps: ProductStep[];
};

export function RecipeEditor(props: Props) {
  const { product, lines, supplies, hourlyRate, toolWearPct, versions, members, soldLast90Days, timerSessions, steps } = props;
  const { timer, elapsed, running, start, pause, resume, stop } = useTimer();
  const isThis = timer?.productId === product.id;
  const liveSeconds = product.labor_seconds + (isThis ? elapsed : 0);

  const [supplyId, setSupplyId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  const breakdown = costBreakdown({
    lines: lines.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies.unit_cost) })),
    laborSeconds: liveSeconds,
    hourlyRate,
    toolWearPct,
  });
  const canMake = (() => {
    const avail = lines.map((l) => ({ quantity: Number(l.quantity), remaining: Number(l.supplies.quantity_remaining) }));
    if (avail.length === 0) return 0;
    return Math.min(...avail.map((l) => (l.quantity > 0 ? Math.floor(l.remaining / l.quantity) : Infinity)));
  })();

  const usedIds = new Set(lines.map((l) => l.supply_id));
  const available = supplies.filter((s) => !usedIds.has(s.id));
  const pickedUnit = supplies.find((s) => s.id === supplyId)?.unit;

  const pickSupply = (id: string) => {
    setSupplyId(id);
    setTimeout(() => qtyRef.current?.focus(), 0);
  };

  const memberById = new Map(members.map((m) => [m.user_id, m]));
  const perPiece = averageSecondsPerPiece(timerSessions.map((s) => ({ userId: s.user_id, orderId: s.order_id, seconds: s.seconds })));
  const sortedPerPiece = [...perPiece].sort((a, b) => a.avgSeconds - b.avgSeconds);
  const fastest = sortedPerPiece[0];
  const overallAvgSeconds = perPiece.length > 0 ? perPiece.reduce((s, p) => s + p.avgSeconds, 0) / perPiece.length : liveSeconds;
  const savingsIfAllFastest =
    fastest && perPiece.length > 1
      ? perPiece.reduce((s, p) => s + Math.max(0, (p.avgSeconds - fastest.avgSeconds) / 3600) * hourlyRate, 0) / perPiece.length
      : 0;

  const latestVersion = versions[0];
  const editor = latestVersion ? memberById.get(latestVersion.created_by ?? "") : undefined;
  const daysAgo = latestVersion ? Math.max(0, Math.floor((Date.now() - new Date(latestVersion.created_at).getTime()) / 86400000)) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
        <span>
          {soldLast90Days > 0 && `${soldLast90Days} vendidos en 90 días`}
          {soldLast90Days > 0 && perPiece.length > 0 && " · "}
          {perPiece.length > 0 && `tiempo promedio ${duration(Math.round(overallAvgSeconds))}`}
        </span>
        {latestVersion && (
          <span className="chip bg-surface-muted text-ink-2">
            Versión {latestVersion.version_number} · vigente
            {editor && daysAgo !== null && ` · editado por ${editor.email.split("@")[0]} hace ${daysAgo} día${daysAgo === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex flex-col gap-6">
          {/* Encabezado editable */}
          <form action={updateProduct} className="flex flex-col gap-2">
            <input type="hidden" name="id" value={product.id} />
            <span className="chip self-start bg-success-soft text-success-ink">
              {props.itemLabel}
              {product.category ? ` · ${product.category}` : ""}
            </span>
            <label className="sr-only" htmlFor="product-name">
              Nombre
            </label>
            <input
              id="product-name"
              name="name"
              defaultValue={product.name}
              required
              onBlur={(e) => {
                if (e.currentTarget.value.trim()) e.currentTarget.form?.requestSubmit();
                else e.currentTarget.value = product.name;
              }}
              className="w-full bg-transparent font-display text-[32px] leading-tight outline-none focus:underline"
            />
          </form>

          {/* Cronómetro de talento */}
          <section className="flex flex-col gap-3.5 rounded-[22px] bg-night p-5 text-on-night">
            <div className="flex items-center justify-between text-[13px] text-on-night-muted">
              <span>{props.timerLabel}</span>
              <span>{money(hourlyRate)} / hora</span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="font-display text-[42px] tabular-nums tracking-wide">{clock(liveSeconds)}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => (isThis ? (running ? pause() : resume()) : start(product.id, product.name))}
                  aria-label={isThis && running ? "Pausar cronómetro" : "Iniciar cronómetro"}
                  className="flex size-15 cursor-pointer items-center justify-center rounded-full bg-accent text-night transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
                >
                  {isThis && running ? <IconPause size={24} /> : <IconPlay size={24} />}
                </button>
                {isThis && (
                  <button
                    onClick={() => stop()}
                    aria-label="Terminar sesión y guardar tiempo"
                    className="flex size-15 cursor-pointer items-center justify-center rounded-full bg-white/10 transition-all duration-150 hover:bg-white/15 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  >
                    <IconStop size={20} />
                  </button>
                )}
              </div>
            </div>
            <ThreadLine className="text-accent opacity-80" />
            <p className="text-[13px] text-on-night-muted">
              {isThis
                ? running
                  ? `${props.activeVerb}… el costo se actualiza en vivo. Toca ■ para guardar la sesión.`
                  : "En pausa. Toca ▶ para seguir o ■ para guardar."
                : `Tiempo acumulado: ${duration(product.labor_seconds)}. Toca ▶ cuando empieces.`}
            </p>
            <details className="text-[13px] text-on-night-muted">
              <summary className="cursor-pointer">Ajustar tiempo a mano</summary>
              <form action={updateProduct} className="mt-2 flex items-end gap-2">
                <input type="hidden" name="id" value={product.id} />
                <label className="flex flex-1 flex-col gap-1">
                  Minutos totales
                  <input
                    name="labor_minutes"
                    type="number"
                    min="0"
                    defaultValue={Math.round(product.labor_seconds / 60)}
                    className="min-h-11 rounded-xl bg-white/10 px-3 text-on-night outline-none"
                  />
                </label>
                <SubmitButton className="btn min-h-11 bg-white/15 text-on-night">Guardar</SubmitButton>
              </form>
            </details>
          </section>

          {/* Insumos del patrón (= lista de materiales) */}
          <section className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">Insumos del {props.itemLabel.toLowerCase()}</h2>
              {lines.length > 0 && (
                <span className="text-sm text-muted">
                  Alcanza para {canMake} pieza{canMake === 1 ? "" : "s"}
                </span>
              )}
            </div>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const id = e.dataTransfer.getData("text/supply-id");
                if (id) pickSupply(id);
              }}
              className={`card flex flex-col transition ${dragOver ? "border-primary ring-2 ring-primary/20" : ""}`}
            >
              {lines.map((l) => {
                const u = UNIT_LABEL[l.supplies.unit];
                return (
                  <div key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-3">
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-[15px] font-medium">
                        {l.supplies.name}
                        {l.supplies.lot_color ? ` · ${l.supplies.lot_color}` : ""}
                      </span>
                      <span className="text-xs text-muted">
                        {Number(l.quantity)} {u.short} × {unitMoney(Number(l.supplies.unit_cost))}
                      </span>
                    </span>
                    <span className="text-[15px] font-semibold tabular-nums">
                      {money(Number(l.quantity) * Number(l.supplies.unit_cost))}
                    </span>
                    <form action={removeRecipeLine}>
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="product_id" value={product.id} />
                      <button aria-label={`Quitar ${l.supplies.name}`} className="icon-btn size-10">
                        <IconTrash size={18} />
                      </button>
                    </form>
                  </div>
                );
              })}

              <form
                action={async (fd) => {
                  await upsertRecipeLine(fd);
                  setSupplyId("");
                }}
                className="flex flex-wrap items-end gap-2.5 p-3"
              >
                <input type="hidden" name="product_id" value={product.id} />
                <label className="field min-w-44 flex-[2]">
                  {dragOver ? "Suelta el insumo aquí" : "Agregar insumo"}
                  <select
                    className="input"
                    name="supply_id"
                    value={supplyId}
                    onChange={(e) => pickSupply(e.target.value)}
                    required
                  >
                    <option value="">Elige un insumo…</option>
                    {available.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                        {s.lot_color ? ` · ${s.lot_color}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field w-28">
                  Cantidad{pickedUnit ? ` (${pickedUnit})` : ""}
                  <input
                    ref={qtyRef}
                    className="input"
                    name="quantity"
                    type="number"
                    inputMode="decimal"
                    min="0.01"
                    step="any"
                    required
                  />
                </label>
                <SubmitButton className="btn-ghost" pendingText="…">
                  Agregar
                </SubmitButton>
              </form>
            </div>

            {available.length > 0 && (
              <div className="hidden flex-wrap gap-2 md:flex" aria-label="Arrastra un insumo al patrón">
                {available.slice(0, 12).map((s) => (
                  <button
                    key={s.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData("text/supply-id", s.id)}
                    onClick={() => pickSupply(s.id)}
                    className="chip cursor-grab gap-1.5 border border-border-strong bg-surface py-2 text-ink-2"
                  >
                    <IconOvillo size={14} /> {s.name}
                  </button>
                ))}
              </div>
            )}
            {supplies.length === 0 && (
              <p className="text-sm text-muted">Primero registra tus compras en Insumos para poder usarlas aquí.</p>
            )}
          </section>

          {/* Pasos del patrón: se tildan por pedido desde "Mi turno" (Fase 8) */}
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">Pasos del patrón</h2>
            <div className="card flex flex-col">
              {steps.length === 0 && <p className="p-4 text-sm text-muted">Sin pasos todavía. Ayuda a que "Mi turno" guíe a tu equipo.</p>}
              {steps.map((s) => (
                <div key={s.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{s.name}</span>
                    {s.detail && <span className="truncate text-xs text-muted">{s.detail}</span>}
                  </span>
                  <form action={removeProductStep}>
                    <input type="hidden" name="id" value={s.id} />
                    <input type="hidden" name="product_id" value={product.id} />
                    <button aria-label={`Quitar ${s.name}`} className="icon-btn size-10">
                      <IconTrash size={18} />
                    </button>
                  </form>
                </div>
              ))}
              <form action={addProductStep} className="flex flex-wrap items-end gap-2.5 p-3">
                <input type="hidden" name="product_id" value={product.id} />
                <label className="field min-w-32 flex-1">
                  Nuevo paso
                  <input className="input" name="name" placeholder="Ej. Cabeza" required />
                </label>
                <label className="field min-w-44 flex-[2]">
                  Detalle (opcional)
                  <input className="input" name="detail" placeholder="Ej. 6 vueltas en aumento" />
                </label>
                <SubmitButton className="btn-ghost" pendingText="…">
                  Agregar
                </SubmitButton>
              </form>
            </div>
          </section>

          {/* Tiempo real por tejedora */}
          {perPiece.length > 0 && (
            <section className="flex flex-col gap-3">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-xl font-semibold">Tiempo real por tejedora</h2>
                <span className="text-xs text-muted">Cronómetro vinculado a pedidos</span>
              </div>
              <div className="card flex flex-col gap-3 p-4">
                {sortedPerPiece.map((p) => {
                  const m = memberById.get(p.userId);
                  const pct = fastest ? Math.round((fastest.avgSeconds / p.avgSeconds) * 100) : 100;
                  return (
                    <div key={p.userId} className="grid grid-cols-[1fr_auto] items-center gap-3 text-sm">
                      <span className="min-w-0 truncate">{m?.email.split("@")[0] ?? "Ex miembro"}</span>
                      <span className="tabular-nums text-ink-2">{duration(Math.round(p.avgSeconds))}</span>
                      <div className="col-span-2 h-2.5 overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              {savingsIfAllFastest > 50 && fastest && (
                <p className="rounded-xl bg-surface-muted p-3 text-sm text-ink-2">
                  Si todo el equipo tejiera al ritmo de {memberById.get(fastest.userId)?.email.split("@")[0] ?? "la más rápida"}, esta
                  pieza costaría {money(savingsIfAllFastest)} menos en mano de obra.
                </p>
              )}
            </section>
          )}
        </div>

        {/* Costeo */}
        <aside className="flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
          <CostingSimulator
            productId={product.id}
            initialMinutes={Math.round(product.labor_seconds / 60) || 30}
            hourlyRate={hourlyRate}
            toolWearPct={toolWearPct}
            materials={breakdown.materials}
            channels={props.channels}
          />

          <form action={deleteProduct} onSubmit={(e) => !confirm("¿Eliminar este patrón?") && e.preventDefault()}>
            <input type="hidden" name="id" value={product.id} />
            <button className="btn w-full text-sm text-muted">Eliminar {props.itemLabel.toLowerCase()}</button>
          </form>
        </aside>
      </div>
    </div>
  );
}
