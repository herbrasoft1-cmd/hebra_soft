/**
 * Motor de costeo de HEBRA (lógica pura, sin dependencias: se testea con Vitest).
 * Materiales + Mano de obra + % Desgaste de herramientas → precios sugeridos.
 */

export type RecipeLine = {
  quantity: number; // cantidad usada en la pieza (g, m, u, ml)
  unitCost: number; // costo por unidad mínima del insumo
};

export type CostInput = {
  lines: RecipeLine[];
  laborSeconds: number;
  hourlyRate: number;
  toolWearPct: number;
};

export type CostBreakdown = {
  materials: number;
  labor: number;
  wear: number;
  total: number;
};

export const DEFAULT_MARGINS = [30, 50, 100] as const;

/** Costo por unidad mínima: 100 g a $15.000 → $150 por gramo. */
export function unitCost(totalCost: number, quantityPurchased: number): number {
  if (quantityPurchased <= 0) return 0;
  return totalCost / quantityPurchased;
}

export function materialsCost(lines: RecipeLine[]): number {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);
}

export function laborCost(seconds: number, hourlyRate: number): number {
  return (Math.max(0, seconds) / 3600) * hourlyRate;
}

export function costBreakdown(input: CostInput): CostBreakdown {
  const materials = materialsCost(input.lines);
  const labor = laborCost(input.laborSeconds, input.hourlyRate);
  const wear = (materials + labor) * (input.toolWearPct / 100);
  return { materials, labor, wear, total: materials + labor + wear };
}

/** Precio de venta = costo × (1 + margen). Se redondea a la centena para precios "limpios". */
export function suggestedPrice(totalCost: number, marginPct: number, roundTo = 100): number {
  const raw = totalCost * (1 + marginPct / 100);
  return roundTo > 0 ? Math.ceil(raw / roundTo) * roundTo : raw;
}

export function suggestedPrices(
  totalCost: number,
  margins: readonly number[] = DEFAULT_MARGINS,
): { margin: number; price: number }[] {
  return margins.map((margin) => ({ margin, price: suggestedPrice(totalCost, margin) }));
}

/** ¿Cuántas piezas alcanzan con el inventario actual? (el insumo más escaso manda) */
export function piecesAvailable(
  lines: { quantity: number; remaining: number }[],
): number {
  if (lines.length === 0) return 0;
  return Math.min(...lines.map((l) => (l.quantity > 0 ? Math.floor(l.remaining / l.quantity) : Infinity)));
}

// ---------------------------------------------------------------------------
// Simulador de precio (Fase 4): margen sobre precio de venta, no sobre costo
// — fórmula exacta de docs/mockups/Ent-Costeo.dc.html.
// ---------------------------------------------------------------------------

export const SIMULATOR_MARGINS = [30, 40, 50, 60] as const;
export const IVA_PCT = 19;

export type SimulatorChannel = { commissionPct: number; fixedFee: number };

export type SimulatorInput = {
  materials: number;
  laborSeconds: number;
  hourlyRate: number;
  toolWearPct: number;
  channel: SimulatorChannel;
  marginPct: number;
  includeIva: boolean;
};

export type SimulatorResult = {
  materials: number;
  labor: number;
  wear: number;
  cost: number;
  /** Precio sin IVA, ya redondeado a la centena — el que entra al margen objetivo. */
  netPrice: number;
  commissionAmount: number;
  ivaAmount: number;
  /** netPrice + ivaAmount, redondeado a la centena — el que paga el cliente si se incluye IVA. */
  finalPrice: number;
  profit: number;
};

/**
 * precio_neto = ceil((costo + fijo_canal) / (1 − margen − %comisión) / 100) × 100
 * utilidad = precio_neto − costo − comisión. El IVA, si se incluye, se suma y se
 * vuelve a redondear aparte — no es ganancia del negocio, es un impuesto que pasa.
 */
export function simulatorPrice(input: SimulatorInput): SimulatorResult {
  const labor = laborCost(input.laborSeconds, input.hourlyRate);
  const wear = (input.materials + labor) * (input.toolWearPct / 100);
  const cost = input.materials + labor + wear;

  const marginFraction = input.marginPct / 100;
  const commissionFraction = input.channel.commissionPct / 100;
  const denominator = 1 - marginFraction - commissionFraction;
  const rawNet = (cost + input.channel.fixedFee) / denominator;
  const netPrice = Math.ceil(rawNet / 100) * 100;

  const commissionAmount = netPrice * commissionFraction + input.channel.fixedFee;
  const ivaAmount = input.includeIva ? netPrice * (IVA_PCT / 100) : 0;
  const finalPrice = Math.ceil((netPrice + ivaAmount) / 100) * 100;
  const profit = netPrice - cost - commissionAmount;

  return { materials: input.materials, labor, wear, cost, netPrice, commissionAmount, ivaAmount, finalPrice, profit };
}

/**
 * Tiempo real por tejedora (Fase 4): promedio de segundos por pieza distinta.
 * Solo cuentan sesiones vinculadas a un pedido (order_id) — las sesiones sueltas
 * de Recetario son para afinar la receta, no para medir producción real.
 */
export function averageSecondsPerPiece(
  sessions: { userId: string; orderId: string | null; seconds: number }[],
): { userId: string; avgSeconds: number; pieces: number }[] {
  const byPiece = new Map<string, number>();
  for (const s of sessions) {
    if (!s.orderId) continue;
    const key = `${s.userId}\u0000${s.orderId}`;
    byPiece.set(key, (byPiece.get(key) ?? 0) + s.seconds);
  }
  const totals = new Map<string, { total: number; pieces: number }>();
  for (const [key, seconds] of byPiece) {
    const userId = key.split("\u0000")[0]!;
    const cur = totals.get(userId) ?? { total: 0, pieces: 0 };
    cur.total += seconds;
    cur.pieces += 1;
    totals.set(userId, cur);
  }
  return Array.from(totals.entries()).map(([userId, { total, pieces }]) => ({
    userId,
    avgSeconds: total / pieces,
    pieces,
  }));
}
