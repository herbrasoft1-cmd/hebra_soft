import { describe, expect, it } from "vitest";
import { committedHours, dueUrgency, estimatedHours, progressPct, suggestReassignment, weeklyAvailableHours } from "./production";

describe("estimatedHours", () => {
  it("multiplica el tiempo del patrón por la cantidad", () => {
    expect(estimatedHours(3600, 3)).toBe(3); // 1 h por pieza × 3
    expect(estimatedHours(0, 5)).toBe(0);
  });
});

describe("progressPct", () => {
  it("calcula el % de avance y lo limita a 100", () => {
    expect(progressPct(3600 * 2, 4)).toBe(50);
    expect(progressPct(3600 * 10, 4)).toBe(100);
  });
  it("devuelve 0 si no hay horas estimadas (evita dividir por cero)", () => {
    expect(progressPct(1000, 0)).toBe(0);
  });
});

describe("dueUrgency", () => {
  const today = new Date("2026-10-10T00:00:00");
  it("vencido si la fecha ya pasó y no está enviado", () => {
    expect(dueUrgency("2026-10-05", "proceso", today)).toBe("late");
  });
  it("vence pronto si es hoy o mañana", () => {
    expect(dueUrgency("2026-10-10", "proceso", today)).toBe("warn");
    expect(dueUrgency("2026-10-11", "proceso", today)).toBe("warn");
  });
  it("holgado si falta más de un día, o sin fecha, o ya enviado", () => {
    expect(dueUrgency("2026-10-20", "proceso", today)).toBe("ok");
    expect(dueUrgency(null, "proceso", today)).toBe("ok");
    expect(dueUrgency("2026-10-01", "enviado", today)).toBe("ok");
  });
});

describe("weeklyAvailableHours", () => {
  it("suma las horas de todos los días de esa persona", () => {
    const rows = [
      { user_id: "a", hours: 8 },
      { user_id: "a", hours: 6 },
      { user_id: "b", hours: 5 },
    ];
    expect(weeklyAvailableHours(rows, "a")).toBe(14);
    expect(weeklyAvailableHours(rows, "c")).toBe(0);
  });
});

describe("committedHours", () => {
  it("suma solo pedidos activos asignados a esa persona, restando lo ya avanzado", () => {
    const orders = [
      { id: "1", title: "A", assigned_to: "a", status: "proceso" as const, estimatedHoursValue: 10, loggedSeconds: 3600 * 4 },
      { id: "2", title: "B", assigned_to: "a", status: "enviado" as const, estimatedHoursValue: 5, loggedSeconds: 0 },
      { id: "3", title: "C", assigned_to: "b", status: "proceso" as const, estimatedHoursValue: 3, loggedSeconds: 0 },
    ];
    expect(committedHours(orders, "a")).toBe(6); // 10 - 4, el pedido enviado no cuenta
  });
});

describe("suggestReassignment", () => {
  it("sugiere mover el pedido más grande que quepa, de la más sobrecargada a la más holgada", () => {
    const people = [
      { userId: "a", name: "Lina", availableHours: 10, committedHours: 15 }, // -5 sobrecargada
      { userId: "b", name: "Ana", availableHours: 10, committedHours: 2 }, // +8 holgada
    ];
    const orders = [
      { id: "1", title: "Pequeño", assigned_to: "a", status: "proceso" as const, estimatedHoursValue: 3, loggedSeconds: 0 },
      { id: "2", title: "Grande", assigned_to: "a", status: "proceso" as const, estimatedHoursValue: 7, loggedSeconds: 0 },
      { id: "3", title: "Ya empezado", assigned_to: "a", status: "proceso" as const, estimatedHoursValue: 5, loggedSeconds: 100 },
    ];
    const s = suggestReassignment(people, orders);
    expect(s).toEqual({ orderId: "2", orderTitle: "Grande", fromUserId: "a", toUserId: "b", hours: 7 });
  });

  it("no sugiere nada si nadie está sobrecargado", () => {
    const people = [
      { userId: "a", name: "Lina", availableHours: 10, committedHours: 5 },
      { userId: "b", name: "Ana", availableHours: 10, committedHours: 5 },
    ];
    expect(suggestReassignment(people, [])).toBeNull();
  });

  it("no sugiere nada si ningún pedido movible cabe en la holgura disponible", () => {
    const people = [
      { userId: "a", name: "Lina", availableHours: 10, committedHours: 15 },
      { userId: "b", name: "Ana", availableHours: 10, committedHours: 9 }, // solo 1 h de holgura
    ];
    const orders = [{ id: "1", title: "Grande", assigned_to: "a", status: "proceso" as const, estimatedHoursValue: 7, loggedSeconds: 0 }];
    expect(suggestReassignment(people, orders)).toBeNull();
  });
});
