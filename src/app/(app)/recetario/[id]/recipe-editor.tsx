"use client";

import { useRef, useState } from "react";
import { IconOvillo, IconPause, IconPlay, IconStop, IconTrash, ThreadLine } from "@/components/icons";
import { SubmitButton } from "@/components/submit-button";
import { useTimer } from "@/components/timer";
import { costBreakdown, DEFAULT_MARGINS, piecesAvailable, suggestedPrices } from "@/lib/costing";
import { UNIT_LABEL, clock, duration, money, unitMoney } from "@/lib/format";
import type { Product, ProductSupply, Supply } from "@/lib/types";
import { deleteProduct, removeRecipeLine, updateProduct, upsertRecipeLine } from "../actions";

type Props = {
  product: Product;
  lines: ProductSupply[];
  supplies: Supply[];
  hourlyRate: number;
  toolWearPct: number;
  itemLabel: string;
  timerLabel: string;
  activeVerb: string;
};

export function RecipeEditor(props: Props) {
  const { product, lines, supplies, hourlyRate, toolWearPct } = props;
  const { timer, elapsed, running, start, pause, resume, stop } = useTimer();
  const isThis = timer?.productId === product.id;
  const liveSeconds = product.labor_seconds + (isThis ? elapsed : 0);

  const [margin, setMargin] = useState<number>(Number(product.target_margin_pct) || 50);
  const [supplyId, setSupplyId] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const qtyRef = useRef<HTMLInputElement>(null);

  const breakdown = costBreakdown({
    lines: lines.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies.unit_cost) })),
    laborSeconds: liveSeconds,
    hourlyRate,
    toolWearPct,
  });
  const prices = suggestedPrices(breakdown.total, DEFAULT_MARGINS);
  const selected = prices.find((p) => p.margin === margin) ?? prices[1]!;
  const canMake = piecesAvailable(
    lines.map((l) => ({ quantity: Number(l.quantity), remaining: Number(l.supplies.quantity_remaining) })),
  );

  const usedIds = new Set(lines.map((l) => l.supply_id));
  const available = supplies.filter((s) => !usedIds.has(s.id));
  const pickedUnit = supplies.find((s) => s.id === supplyId)?.unit;

  const pickSupply = (id: string) => {
    setSupplyId(id);
    setTimeout(() => qtyRef.current?.focus(), 0);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="flex flex-col gap-6">
        {/* Encabezado editable */}
        <form action={updateProduct} className="flex flex-col gap-2">
          <input type="hidden" name="id" value={product.id} />
          <span className="chip self-start bg-sage-soft text-sage-ink">
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
                className="flex size-15 cursor-pointer items-center justify-center rounded-full bg-accent text-night shadow-md transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
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

        {/* Insumos del patrón */}
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
                <div key={l.id} className="flex items-center gap-3 border-b border-line px-4 py-3">
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
                  className="chip cursor-grab gap-1.5 border border-line-strong bg-surface py-2 text-ink-2"
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
      </div>

      {/* Costo y precio */}
      <aside className="flex flex-col gap-5 lg:sticky lg:top-8 lg:self-start">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Costo real de la pieza</h2>
          <div className="card flex flex-col gap-2.5 px-4 py-3.5 text-sm">
            <Row label="Materiales" value={money(breakdown.materials)} />
            <Row label={`Mano de obra (${duration(liveSeconds)})`} value={money(breakdown.labor)} />
            <Row label={`Desgaste de herramientas (${toolWearPct}%)`} value={money(breakdown.wear)} />
            <div className="h-px bg-line" />
            <div className="flex justify-between text-base font-semibold">
              <span>Costo total</span>
              <span className="tabular-nums">{money(breakdown.total)}</span>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Precio sugerido</h2>
          <div className="grid grid-cols-3 gap-2">
            {prices.map((p) => {
              const active = p.margin === margin;
              return (
                <button
                  key={p.margin}
                  onClick={() => setMargin(p.margin)}
                  aria-pressed={active}
                  className={`flex min-h-18 flex-col items-center justify-center gap-0.5 rounded-2xl ${
                    active ? "border-2 border-primary bg-primary-soft" : "border border-line bg-surface"
                  }`}
                >
                  <span className={`text-xs ${active ? "font-semibold text-primary-ink" : "text-muted"}`}>
                    Margen {p.margin}%
                  </span>
                  <span className="text-base font-semibold tabular-nums">{money(p.price)}</span>
                </button>
              );
            })}
          </div>
          <form action={updateProduct}>
            <input type="hidden" name="id" value={product.id} />
            <input type="hidden" name="target_margin_pct" value={margin} />
            <input type="hidden" name="sale_price" value={selected.price} />
            <SubmitButton className="btn-primary w-full">Guardar precio de {money(selected.price)}</SubmitButton>
          </form>
          {product.sale_price != null && (
            <p className="text-center text-sm text-muted">Precio actual: {money(product.sale_price)}</p>
          )}
        </section>

        <form action={deleteProduct} onSubmit={(e) => !confirm("¿Eliminar este patrón?") && e.preventDefault()}>
          <input type="hidden" name="id" value={product.id} />
          <button className="btn w-full text-sm text-muted">Eliminar {props.itemLabel.toLowerCase()}</button>
        </form>
      </aside>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-ink-2">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
