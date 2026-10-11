"use client";

import { useId, useState } from "react";
import { bucketSeries, type ChartPeriod, type DailyPoint } from "@/lib/analytics";
import { compactMoney, money } from "@/lib/format";
import { SegmentedControl } from "./ui/segmented-control";

/**
 * Gráficos de HEBRA: siempre una sola serie (color secuencial, nunca categórico),
 * barras delgadas ancladas a la línea base, tooltip en foco/hover y una vista de
 * tabla como equivalente accesible — nunca solo color para transmitir un valor.
 *
 * Nota de marca: los valores grandes usan font-display (Fraunces) a propósito,
 * igual que el resto de HEBRA (precios, totales) — es la tipografía de marca
 * para cifras, no una decoración fuera de lugar.
 */

export type ChartPoint = { label: string; value: number };

const TONE_BAR = { primary: "bg-primary", sage: "bg-success" } as const;
type Tone = keyof typeof TONE_BAR;

/** "money" y "compact" en vez de recibir la función: no se puede pasar una función
 * de un Server Component a un Client Component a través del límite de serialización. */
const FORMATTERS = { money, compact: compactMoney } as const;
type Format = keyof typeof FORMATTERS;

function TableToggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-2.5 py-1 text-xs font-semibold text-muted transition-colors hover:bg-surface-muted hover:text-ink-2"
    >
      {on ? "Ver gráfico" : "Ver tabla"}
    </button>
  );
}

function DataTable({ data, format }: { data: ChartPoint[]; format: Format }) {
  const formatValue = FORMATTERS[format];
  return (
    <table className="w-full text-sm">
      <tbody>
        {data.map((d) => (
          <tr key={d.label} className="border-b border-border last:border-0">
            <td className="py-2.5 text-ink-2">{d.label}</td>
            <td className="py-2.5 text-right font-semibold tabular-nums text-ink">{formatValue(d.value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Columnas verticales: para una tendencia a lo largo del tiempo (ej. ventas por mes). */
export function TrendBars({
  title,
  data,
  format = "money",
  tone = "primary",
}: {
  title: string;
  data: ChartPoint[];
  format?: Format;
  tone?: Tone;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const formatValue = FORMATTERS[format];
  const max = Math.max(1, ...data.map((d) => d.value));
  const hasData = data.some((d) => d.value > 0);

  return (
    <div className="card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 id={titleId} className="text-sm font-semibold text-ink-2">
          {title}
        </h3>
        {hasData && <TableToggle on={showTable} onClick={() => setShowTable((v) => !v)} />}
      </div>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted">Todavía no hay datos para este período.</p>
      ) : showTable ? (
        <DataTable data={data} format={format} />
      ) : (
        <div className="relative flex h-44 items-stretch gap-2.5" role="img" aria-labelledby={titleId}>
          {/* Líneas guía recesivas */}
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-t border-border" />
            ))}
          </div>
          {data.map((d, i) => {
            const h = d.value > 0 ? Math.max(3, Math.round((d.value / max) * 100)) : 0;
            const active = hover === i;
            return (
              <div
                key={d.label}
                className="relative z-10 flex flex-1 flex-col items-center justify-end gap-2.5 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {active && (
                  <div className="absolute -top-9 whitespace-nowrap rounded-lg bg-night px-2.5 py-1.5 text-xs font-semibold text-on-night">
                    {formatValue(d.value)}
                  </div>
                )}
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className={`w-full max-w-8 rounded-t-[4px] transition-opacity ${TONE_BAR[tone]} ${
                      active || hover === null ? "opacity-90" : "opacity-45"
                    }`}
                    style={{ height: `${h}%`, minHeight: h > 0 ? 3 : 0 }}
                  />
                </div>
                <span className="text-[11px] font-medium text-muted">{d.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Barras horizontales de ranking: para comparar magnitud entre categorías (top productos, gastos). */
export function RankingBars({
  title,
  data,
  format = "money",
  tone = "primary",
  emptyText,
}: {
  title: string;
  data: ChartPoint[];
  format?: Format;
  tone?: Tone;
  emptyText: string;
}) {
  const [showTable, setShowTable] = useState(false);
  const formatValue = FORMATTERS[format];
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="card p-5">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink-2">{title}</h3>
        {data.length > 0 && <TableToggle on={showTable} onClick={() => setShowTable((v) => !v)} />}
      </div>

      {data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">{emptyText}</p>
      ) : showTable ? (
        <DataTable data={data} format={format} />
      ) : (
        <ul className="flex flex-col gap-4">
          {data.map((d) => (
            <li key={d.label} className="flex flex-col gap-1.5">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="truncate font-medium text-ink">{d.label}</span>
                <span className="shrink-0 font-semibold tabular-nums text-ink-2">{formatValue(d.value)}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <div
                  className={`h-full rounded-full ${TONE_BAR[tone]}`}
                  style={{ width: `${Math.max(3, Math.round((d.value / max) * 100))}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const PERIOD_LABEL: Record<ChartPeriod, string> = { "7d": "7 días", "12s": "12 semanas", "12m": "12 meses" };
const PERIODS: ChartPeriod[] = ["7d", "12s", "12m"];

/**
 * Ingresos y utilidad con pestañas de período: dos series del mismo matiz (secuencial, no
 * categórico — "ingresos" y "utilidad" son la misma magnitud en dos profundidades), la barra
 * de utilidad es una capa interna anidada dentro de la de ingresos, con su alto expresado como
 * % de esa barra (así la capa oscura siempre representa el margen real de ese período).
 */
export function RevenueProfitChart({ daily, todayIso }: { daily: DailyPoint[]; todayIso: string }) {
  const [period, setPeriod] = useState<ChartPeriod>("12s");
  const [hover, setHover] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const titleId = useId();
  const today = new Date(todayIso + "T00:00:00");
  const points = bucketSeries(daily, period, today);
  const hasData = points.some((p) => p.income > 0);
  const max = Math.max(1, ...points.map((p) => p.income));
  const totalIncome = points.reduce((s, p) => s + p.income, 0);
  const totalProfit = points.reduce((s, p) => s + p.profit, 0);
  const marginPct = totalIncome > 0 ? Math.round((totalProfit / totalIncome) * 100) : 0;

  return (
    <div className="card p-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id={titleId} className="text-base font-semibold">
            Ingresos y utilidad
          </h3>
          <p className="text-[13px] text-muted">
            Ingresos {compactMoney(totalIncome)} · Utilidad {compactMoney(totalProfit)} · Margen {marginPct}%
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SegmentedControl
            options={PERIODS.map((p) => ({ value: p, label: PERIOD_LABEL[p] }))}
            value={period}
            onChange={setPeriod}
          />
          {hasData && <TableToggle on={showTable} onClick={() => setShowTable((v) => !v)} />}
        </div>
      </div>

      <div className="mb-4 flex gap-5 text-xs text-ink-2">
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary/25" />
          Ingresos
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          Utilidad
        </span>
      </div>

      {!hasData ? (
        <p className="py-10 text-center text-sm text-muted">Todavía no hay datos para este período.</p>
      ) : showTable ? (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th className="py-2 font-medium">Período</th>
              <th className="py-2 text-right font-medium">Ingresos</th>
              <th className="py-2 text-right font-medium">Utilidad</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.label} className="border-b border-border last:border-0">
                <td className="py-2.5 text-ink-2">{p.label}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{money(p.income)}</td>
                <td className="py-2.5 text-right font-semibold tabular-nums">{money(p.profit)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="relative flex h-52 items-stretch gap-1.5 pb-6" role="img" aria-labelledby={titleId}>
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between">
            {[0, 1, 2].map((i) => (
              <div key={i} className="border-t border-border" />
            ))}
          </div>
          {points.map((p, i) => {
            const incomeH = p.income > 0 ? Math.max(3, Math.round((p.income / max) * 100)) : 0;
            const profitShare = p.income > 0 ? Math.round((p.profit / p.income) * 100) : 0;
            const active = hover === i;
            return (
              <div
                key={`${p.label}-${i}`}
                className="relative z-10 flex flex-1 flex-col items-stretch justify-end rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
              >
                {active && (
                  <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-lg bg-night px-2.5 py-1.5 text-xs font-semibold text-on-night">
                    {p.label}: {money(p.income)} · utilidad {money(p.profit)}
                  </div>
                )}
                <div
                  style={{ height: `${incomeH}%`, minHeight: incomeH > 0 ? 3 : 0 }}
                  className={`flex flex-col justify-end overflow-hidden rounded-t-[4px] bg-primary/25 transition-opacity ${
                    active || hover === null ? "opacity-100" : "opacity-55"
                  }`}
                >
                  <div style={{ height: `${profitShare}%` }} className="bg-primary" />
                </div>
                <span className="absolute bottom-[-22px] left-0 right-0 text-center text-[11px] font-medium text-muted">
                  {p.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Mini tendencia para una tarjeta de estadística (sin interacción: decorativa y contextual). */
export function Sparkline({ data, className = "" }: { data: number[]; className?: string }) {
  if (data.length < 2 || data.every((v) => v === data[0])) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 28;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
