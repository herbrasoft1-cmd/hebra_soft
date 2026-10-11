import { describe, expect, it } from "vitest";
import {
  bucketSeries,
  channelBreakdown,
  ordersAtRisk,
  periodChangePct,
  productProfitability,
} from "./analytics";

describe("periodChangePct", () => {
  it("calcula la variación porcentual redondeada", () => {
    expect(periodChangePct(124000, 100000)).toBe(24);
    expect(periodChangePct(80000, 100000)).toBe(-20);
  });
  it("devuelve null si no hay período anterior (evita dividir por cero)", () => {
    expect(periodChangePct(50000, 0)).toBeNull();
  });
});

describe("ordersAtRisk", () => {
  const today = new Date("2026-10-10T00:00:00");

  it("marca un pedido que vence mañana y no está enviado", () => {
    const items = ordersAtRisk(
      [{ id: "1", title: "Manta para bebé", due_date: "2026-10-11", status: "proceso", product_id: null, assigned_to: "lina" }],
      new Map(),
      today,
    );
    expect(items).toEqual([{ orderId: "1", title: "Manta para bebé", text: "Vence mañana", severity: "alta" }]);
  });

  it("marca un pedido ya vencido como 'Vencido', no 'Vence mañana'", () => {
    const items = ordersAtRisk(
      [{ id: "1", title: "Gorro", due_date: "2026-10-05", status: "espera", product_id: null }],
      new Map(),
      today,
    );
    expect(items[0]?.text).toBe("Vencido");
  });

  it("no marca pedidos ya enviados aunque estén vencidos", () => {
    const items = ordersAtRisk(
      [{ id: "1", title: "Gorro", due_date: "2026-10-05", status: "enviado", product_id: null }],
      new Map(),
      today,
    );
    expect(items).toEqual([]);
  });

  it("no marca pedidos que vencen en más de 1 día", () => {
    const items = ordersAtRisk(
      [{ id: "1", title: "Gorro", due_date: "2026-10-15", status: "espera", product_id: null }],
      new Map(),
      today,
    );
    expect(items).toEqual([]);
  });

  it("marca insumo agotado cuando el producto del pedido tiene un insumo en 0", () => {
    const items = ordersAtRisk(
      [{ id: "2", title: "Gorro de lana x2", due_date: null, status: "espera", product_id: "p1" }],
      new Map([["p1", "Lana mostaza"]]),
      today,
    );
    expect(items).toEqual([{ orderId: "2", title: "Gorro de lana x2", text: "Insumo agotado: Lana mostaza", severity: "alta" }]);
  });

  it("un mismo pedido puede aparecer por varias reglas a la vez", () => {
    const items = ordersAtRisk(
      [{ id: "3", title: "Bolso", due_date: "2026-10-10", status: "proceso", product_id: "p1", assigned_to: "lina" }],
      new Map([["p1", "Lana café"]]),
      today,
    );
    expect(items).toHaveLength(2); // vence hoy + insumo agotado (está asignada, no dispara "sin asignar")
  });

  it("marca sin asignar cuando vence en 2 días o menos y nadie lo tiene", () => {
    const items = ordersAtRisk(
      [{ id: "4", title: "Bolso tote x3", due_date: "2026-10-12", status: "espera", product_id: null, assigned_to: null }],
      new Map(),
      today,
    );
    expect(items).toEqual([{ orderId: "4", title: "Bolso tote x3", text: "Sin asignar · vence pronto", severity: "media" }]);
  });

  it("no marca sin asignar si vence en más de 2 días", () => {
    const items = ordersAtRisk(
      [{ id: "4", title: "Bolso tote x3", due_date: "2026-10-20", status: "espera", product_id: null, assigned_to: null }],
      new Map(),
      today,
    );
    expect(items).toEqual([]);
  });

  it("marca sobrecarga cuando la tejedora asignada está en la lista de sobrecargadas", () => {
    const items = ordersAtRisk(
      [{ id: "5", title: "Amigurumis x12", due_date: null, status: "proceso", product_id: null, assigned_to: "lina" }],
      new Map(),
      today,
      { overloadedUserIds: new Set(["lina"]) },
    );
    expect(items).toEqual([
      { orderId: "5", title: "Amigurumis x12", text: "Tejedora con más horas comprometidas que disponibles esta semana", severity: "media" },
    ]);
  });
});

describe("productProfitability", () => {
  it("calcula margen, marca los que están por debajo del objetivo y ordena de mayor a menor margen", () => {
    const result = productProfitability(
      [
        {
          id: "osito",
          name: "Amigurumi Osito",
          sale_price: 76800,
          target_margin_pct: 40,
          labor_seconds: 200 * 60,
          lines: [{ quantity: 1, unitCost: 8750 }],
        },
        {
          id: "posavasos",
          name: "Set posavasos x6",
          sale_price: 42000,
          target_margin_pct: 40,
          labor_seconds: 60 * 60,
          lines: [{ quantity: 1, unitCost: 5000 }],
        },
      ],
      new Map([["osito", 64]]),
      12000,
      5,
    );
    expect(result[0]?.id).toBe("posavasos"); // mayor margen primero
    expect(result.find((p) => p.id === "osito")?.belowTarget).toBe(true);
    expect(result.find((p) => p.id === "osito")?.units).toBe(64);
    expect(result.find((p) => p.id === "posavasos")?.units).toBe(0); // sin ventas registradas
  });

  it("ignora productos sin precio de venta", () => {
    const result = productProfitability(
      [{ id: "x", name: "Sin precio", sale_price: null, target_margin_pct: 40, labor_seconds: 0, lines: [] }],
      new Map(),
      12000,
      5,
    );
    expect(result).toEqual([]);
  });
});

describe("channelBreakdown", () => {
  it("agrupa pedidos sin canal como 'Sin canal' y calcula el porcentaje", () => {
    const result = channelBreakdown([
      { channel: "Instagram", price: 100000, quantity: 1 },
      { channel: "Instagram", price: 50000, quantity: 1 },
      { channel: null, price: 50000, quantity: 1 },
    ]);
    expect(result).toEqual([
      { channel: "Instagram", amount: 150000, pct: 75 },
      { channel: "Sin canal", amount: 50000, pct: 25 },
    ]);
  });

  it("no revienta con una lista vacía", () => {
    expect(channelBreakdown([])).toEqual([]);
  });
});

describe("bucketSeries", () => {
  const today = new Date("2026-10-10T00:00:00");

  it("7d: devuelve 7 puntos con las etiquetas de día correctas y ceros donde no hay datos", () => {
    const result = bucketSeries([{ date: "2026-10-10", income: 100, profit: 40 }], "7d", today);
    expect(result).toHaveLength(7);
    expect(result[6]).toEqual({ label: "Sáb", income: 100, profit: 40 });
    expect(result[0]?.income).toBe(0);
  });

  it("12m: suma todos los días de cada mes calendario", () => {
    const daily = [
      { date: "2026-10-01", income: 100, profit: 40 },
      { date: "2026-10-10", income: 200, profit: 80 },
      { date: "2026-09-15", income: 50, profit: 20 },
    ];
    const result = bucketSeries(daily, "12m", today);
    expect(result[11]).toEqual({ label: "oct", income: 300, profit: 120 });
    expect(result[10]).toEqual({ label: "sep", income: 50, profit: 20 });
  });

  it("12s: suma los 7 días de cada semana", () => {
    const daily = [
      { date: "2026-10-10", income: 100, profit: 40 },
      { date: "2026-10-09", income: 50, profit: 20 },
    ];
    const result = bucketSeries(daily, "12s", today);
    expect(result).toHaveLength(12);
    expect(result[11]?.income).toBe(150);
  });
});
