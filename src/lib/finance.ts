/**
 * Cálculos de Finanzas (Fase 6): funciones puras, sin dependencias de
 * Supabase, para poder probarlas con Vitest.
 */
import { laborCost } from "./costing";

export type AgingBucket = "0-15" | "16-30" | "31-60" | "60+";
export const AGING_BUCKETS: AgingBucket[] = ["0-15", "16-30", "31-60", "60+"];

export type ReceivableOrder = { balance: number; dueDate: string | null; createdAt: string };

/** Cartera por antigüedad: bucketea el saldo pendiente por días de mora desde la entrega (o desde
 * que se creó el pedido, si nunca tuvo fecha de entrega). */
export function receivableAging(orders: ReceivableOrder[], today: Date): Record<AgingBucket, number> {
  const totals: Record<AgingBucket, number> = { "0-15": 0, "16-30": 0, "31-60": 0, "60+": 0 };
  const todayIso = today.toISOString().slice(0, 10);
  for (const o of orders) {
    if (o.balance <= 0) continue;
    const since = (o.dueDate ?? o.createdAt).slice(0, 10);
    const days = Math.max(0, Math.round((new Date(todayIso).getTime() - new Date(since).getTime()) / 86400000));
    const bucket: AgingBucket = days <= 15 ? "0-15" : days <= 30 ? "16-30" : days <= 60 ? "31-60" : "60+";
    totals[bucket] += o.balance;
  }
  return totals;
}

export type IncomeStatementInput = {
  income: number;
  materials: number;
  labor: number;
  commissions: number;
  fixedExpenses: number;
};

export type IncomeStatement = IncomeStatementInput & {
  costOfProduction: number;
  netProfit: number;
  netMarginPct: number;
};

/** Estado de resultados en cascada: ingresos − materiales − mano de obra − comisiones − gastos fijos. */
export function incomeStatement(input: IncomeStatementInput): IncomeStatement {
  const costOfProduction = input.materials + input.labor;
  const netProfit = input.income - costOfProduction - input.commissions - input.fixedExpenses;
  const netMarginPct = input.income > 0 ? (netProfit / input.income) * 100 : 0;
  return { ...input, costOfProduction, netProfit, netMarginPct };
}

export type ChannelRate = { commission_pct: number; fixed_fee: number } | null;

/** Comisión real de un pedido ya vendido (no el despeje inverso del simulador de precio). */
export function channelCommission(price: number, quantity: number, channel: ChannelRate): number {
  if (!channel) return 0;
  return (price * quantity * channel.commission_pct) / 100 + channel.fixed_fee;
}

/** Devolución justa al cancelar un pedido: todo lo pagado, menos el costo real de las horas ya
 * tejidas (no un porcentaje inventado — el tiempo real logueado con el cronómetro). Redondeado a
 * pesos enteros: nadie paga ni devuelve fracciones de peso. */
export function suggestedRefund(totalPaid: number, laborLoggedSeconds: number, hourlyRate: number): number {
  const alreadyEarned = laborCost(laborLoggedSeconds, hourlyRate);
  return Math.max(0, Math.round(totalPaid - alreadyEarned));
}
