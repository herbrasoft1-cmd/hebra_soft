/**
 * Cálculos de producción y capacidad (Fase 3): funciones puras, sin dependencias
 * de Supabase, para poder probarlas con Vitest.
 */
import type { OrderStatus } from "./types";

/** Horas estimadas de un pedido: tiempo del patrón × cantidad (ROADMAP). */
export function estimatedHours(laborSeconds: number, quantity: number): number {
  return (Math.max(0, laborSeconds) / 3600) * Math.max(0, quantity);
}

/** % de avance: horas logueadas por el cronómetro contra el pedido / horas estimadas. */
export function progressPct(loggedSeconds: number, estimatedHoursValue: number): number {
  if (estimatedHoursValue <= 0) return 0;
  const loggedHours = Math.max(0, loggedSeconds) / 3600;
  return Math.min(100, Math.round((loggedHours / estimatedHoursValue) * 100));
}

export type DueUrgency = "late" | "warn" | "ok";

/** Mismos umbrales que ordersAtRisk de analytics.ts: vencido/vence en ≤1 día/holgado. */
export function dueUrgency(dueDate: string | null, status: OrderStatus, today: Date): DueUrgency {
  if (status === "enviado" || !dueDate) return "ok";
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  const todayIso = iso(today);
  const tomorrowIso = iso(new Date(today.getTime() + 86400000));
  if (dueDate < todayIso) return "late";
  if (dueDate <= tomorrowIso) return "warn";
  return "ok";
}

// ---------------------------------------------------------------------------
// Capacidad: totales semanales reales (disponibilidad configurada vs. horas
// estimadas de pedidos activos asignados, menos lo ya avanzado). Nunca se
// reparte por día: el mockup solo colorea por umbral fijo, no simula un
// reparto día a día que nadie configuró con esa precisión.
// ---------------------------------------------------------------------------

export type PersonLoad = {
  userId: string;
  name: string;
  availableHours: number;
  committedHours: number;
};

export function weeklyAvailableHours(rows: { user_id: string; hours: number }[], userId: string): number {
  return rows.filter((r) => r.user_id === userId).reduce((s, r) => s + Number(r.hours), 0);
}

export type OrderForLoad = {
  id: string;
  title: string;
  assigned_to: string | null;
  status: OrderStatus;
  estimatedHoursValue: number;
  loggedSeconds: number;
};

/** Horas comprometidas pendientes = estimadas - ya avanzadas, solo pedidos activos. */
export function committedHours(orders: OrderForLoad[], userId: string): number {
  return orders
    .filter((o) => o.assigned_to === userId && o.status !== "enviado")
    .reduce((s, o) => s + Math.max(0, o.estimatedHoursValue - o.loggedSeconds / 3600), 0);
}

export type Suggestion = { orderId: string; orderTitle: string; fromUserId: string; toUserId: string; hours: number } | null;

/**
 * Heurística simple y explicable: de la persona más sobrecargada (comprometido
 * > disponible) a la más holgada, mueve su pedido más pequeño sin empezar
 * (0 horas logueadas) que quepa en la holgura de quien recibe. null si no hay
 * una sugerencia razonable — nunca se inventa una.
 */
export function suggestReassignment(people: PersonLoad[], movableOrders: OrderForLoad[]): Suggestion {
  const withSlack = people.map((p) => ({ ...p, slack: p.availableHours - p.committedHours }));
  const overloaded = [...withSlack].filter((p) => p.slack < 0).sort((a, b) => a.slack - b.slack)[0];
  const relieved = [...withSlack].filter((p) => p.slack > 0).sort((a, b) => b.slack - a.slack)[0];
  if (!overloaded || !relieved || overloaded.userId === relieved.userId) return null;

  const candidates = movableOrders
    .filter((o) => o.assigned_to === overloaded.userId && o.status !== "enviado" && o.loggedSeconds === 0)
    .filter((o) => o.estimatedHoursValue > 0 && o.estimatedHoursValue <= relieved.slack)
    .sort((a, b) => a.estimatedHoursValue - b.estimatedHoursValue);
  const pick = candidates[candidates.length - 1]; // el más grande que sigue cabiendo
  if (!pick) return null;

  return { orderId: pick.id, orderTitle: pick.title, fromUserId: overloaded.userId, toUserId: relieved.userId, hours: pick.estimatedHoursValue };
}
