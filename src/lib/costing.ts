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
