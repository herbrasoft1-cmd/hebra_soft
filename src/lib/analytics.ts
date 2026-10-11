/**
 * Cálculos del panel ejecutivo (Fase 2): funciones puras, sin dependencias de Supabase,
 * para poder probarlas con Vitest. Las páginas traen los datos y le pasan a estas
 * funciones solo lo que necesitan calcular.
 */
import { costBreakdown, type RecipeLine } from "./costing";
import { DAYS, shortMonth } from "./format";
import type { OrderStatus } from "./types";

/** Variación %: null cuando no hay período anterior con qué comparar (evita dividir por cero). */
export function periodChangePct(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

// ---------------------------------------------------------------------------
// Necesitan atención: solo las 2 reglas calculables con los datos de hoy.
// "Horas > disponibles" y "sin asignar" necesitan datos de la Fase 3 (tejedora
// asignada, disponibilidad) y no se simulan.
// ---------------------------------------------------------------------------

export type OrderForRisk = {
  id: string;
  title: string;
  due_date: string | null;
  status: OrderStatus;
  product_id: string | null;
};

export type RiskItem = {
  orderId: string;
  title: string;
  text: string;
  severity: "alta" | "media";
};

export function ordersAtRisk(
  orders: OrderForRisk[],
  outOfStockByProduct: Map<string, string>,
  today: Date,
): RiskItem[] {
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const todayIso = iso(today);
  const tomorrowIso = iso(new Date(today.getTime() + 86400000));
  const items: RiskItem[] = [];

  for (const o of orders) {
    if (o.status === "enviado") continue;
    if (o.due_date && o.due_date <= tomorrowIso) {
      const text = o.due_date < todayIso ? "Vencido" : o.due_date === todayIso ? "Vence hoy" : "Vence mañana";
      items.push({ orderId: o.id, title: o.title, text, severity: "alta" });
    }
    const supplyName = o.product_id ? outOfStockByProduct.get(o.product_id) : undefined;
    if (supplyName) {
      items.push({ orderId: o.id, title: o.title, text: `Insumo agotado: ${supplyName}`, severity: "alta" });
    }
  }
  return items;
}

// ---------------------------------------------------------------------------
// Rentabilidad por producto
// ---------------------------------------------------------------------------

export type ProductForProfitability = {
  id: string;
  name: string;
  sale_price: number | null;
  target_margin_pct: number;
  labor_seconds: number;
  lines: RecipeLine[];
};

export type ProductProfitability = {
  id: string;
  name: string;
  units: number;
  price: number;
  cost: number;
  marginPct: number;
  belowTarget: boolean;
};

export function productProfitability(
  products: ProductForProfitability[],
  unitsSoldByProduct: Map<string, number>,
  hourlyRate: number,
  toolWearPct: number,
): ProductProfitability[] {
  return products
    .filter((p): p is ProductForProfitability & { sale_price: number } => Boolean(p.sale_price && p.sale_price > 0))
    .map((p) => {
      const b = costBreakdown({ lines: p.lines, laborSeconds: p.labor_seconds, hourlyRate, toolWearPct });
      const marginPct = ((p.sale_price - b.total) / p.sale_price) * 100;
      return {
        id: p.id,
        name: p.name,
        units: unitsSoldByProduct.get(p.id) ?? 0,
        price: p.sale_price,
        cost: b.total,
        marginPct,
        belowTarget: marginPct < Number(p.target_margin_pct),
      };
    })
    .sort((a, b) => b.marginPct - a.marginPct);
}

// ---------------------------------------------------------------------------
// Ventas por canal
// ---------------------------------------------------------------------------

export type ChannelShare = { channel: string; amount: number; pct: number };

export function channelBreakdown(orders: { channel: string | null; price: number; quantity: number }[]): ChannelShare[] {
  const byChannel = new Map<string, number>();
  let total = 0;
  for (const o of orders) {
    const key = o.channel?.trim() || "Sin canal";
    const amount = Number(o.price) * Number(o.quantity);
    byChannel.set(key, (byChannel.get(key) ?? 0) + amount);
    total += amount;
  }
  return Array.from(byChannel.entries())
    .map(([channel, amount]) => ({ channel, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount);
}

// ---------------------------------------------------------------------------
// Gráfico de ingresos y utilidad: serie diaria real -> se reagrupa por período.
// "Utilidad" = ingresos del día × margen promedio real (de productProfitability),
// no un número inventado.
// ---------------------------------------------------------------------------

export type DailyPoint = { date: string; income: number; profit: number };
export type SeriesPoint = { label: string; income: number; profit: number };
export type ChartPeriod = "7d" | "12s" | "12m";

export function bucketSeries(daily: DailyPoint[], period: ChartPeriod, today: Date): SeriesPoint[] {
  const byDate = new Map(daily.map((d) => [d.date, d]));
  const iso = (d: Date) => d.toISOString().slice(0, 10);

  if (period === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today.getTime() - (6 - i) * 86400000);
      const row = byDate.get(iso(d));
      return { label: DAYS[d.getDay()]!, income: row?.income ?? 0, profit: row?.profit ?? 0 };
    });
  }

  if (period === "12s") {
    return Array.from({ length: 12 }, (_, i) => {
      const weeksAgo = 11 - i;
      const end = new Date(today.getTime() - weeksAgo * 7 * 86400000);
      const start = new Date(end.getTime() - 6 * 86400000);
      let income = 0;
      let profit = 0;
      for (let t = start.getTime(); t <= end.getTime(); t += 86400000) {
        const row = byDate.get(iso(new Date(t)));
        if (row) {
          income += row.income;
          profit += row.profit;
        }
      }
      return { label: `${start.getDate()} ${shortMonth(start)}`, income, profit };
    });
  }

  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (11 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    let income = 0;
    let profit = 0;
    for (const row of daily) {
      if (row.date.startsWith(key)) {
        income += row.income;
        profit += row.profit;
      }
    }
    return { label: shortMonth(d), income, profit };
  });
}
