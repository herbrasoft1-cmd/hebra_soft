/**
 * Cálculos de "Mi turno" (Fase 8): funciones puras, sin dependencias de
 * Supabase, para poder probarlas con Vitest.
 */

/** Saldo real de un pedido: nunca negativo aunque se registre de más. */
export function computeSaldo(total: number, incomeAmounts: number[]): number {
  const paid = incomeAmounts.reduce((s, a) => s + Math.max(0, a), 0);
  return Math.max(0, total - paid);
}

export type GoalProgress = { pct: number; over: boolean };

/** Progreso del cronómetro contra la meta del patrón (Ent-Movil-Turno.dc.html). */
export function goalProgress(seconds: number, goalSeconds: number): GoalProgress {
  if (goalSeconds <= 0) return { pct: 0, over: false };
  const pct = Math.min(100, Math.round((Math.max(0, seconds) / goalSeconds) * 100));
  return { pct, over: seconds > goalSeconds };
}
