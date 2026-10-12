import { describe, expect, it } from "vitest";
import { channelCommission, incomeStatement, receivableAging } from "./finance";

describe("receivableAging", () => {
  const today = new Date("2026-10-11T00:00:00Z");

  it("bucketea por días de mora desde due_date", () => {
    const orders = [
      { balance: 100000, dueDate: "2026-10-05", createdAt: "2026-09-01" }, // 6 días
      { balance: 50000, dueDate: "2026-09-20", createdAt: "2026-09-01" }, // 21 días
      { balance: 30000, dueDate: "2026-09-01", createdAt: "2026-08-01" }, // 40 días
      { balance: 10000, dueDate: "2026-07-01", createdAt: "2026-06-01" }, // 102 días
    ];
    expect(receivableAging(orders, today)).toEqual({
      "0-15": 100000,
      "16-30": 50000,
      "31-60": 30000,
      "60+": 10000,
    });
  });

  it("ignora pedidos ya saldados", () => {
    const orders = [{ balance: 0, dueDate: "2026-01-01", createdAt: "2026-01-01" }];
    expect(receivableAging(orders, today)).toEqual({ "0-15": 0, "16-30": 0, "31-60": 0, "60+": 0 });
  });

  it("usa createdAt cuando no hay due_date", () => {
    const orders = [{ balance: 20000, dueDate: null, createdAt: "2026-10-10" }];
    expect(receivableAging(orders, today)["0-15"]).toBe(20000);
  });

  it("suma varios pedidos en el mismo tramo", () => {
    const orders = [
      { balance: 100, dueDate: "2026-10-10", createdAt: "2026-10-01" },
      { balance: 200, dueDate: "2026-10-09", createdAt: "2026-10-01" },
    ];
    expect(receivableAging(orders, today)["0-15"]).toBe(300);
  });
});

describe("incomeStatement", () => {
  it("calcula la cascada completa", () => {
    const r = incomeStatement({ income: 18420000, materials: 3950000, labor: 5850000, commissions: 520000, fixedExpenses: 4580000 });
    expect(r.costOfProduction).toBe(9800000);
    expect(r.netProfit).toBe(3520000);
    expect(r.netMarginPct).toBeCloseTo(19.11, 1);
  });

  it("margen 0 cuando no hay ingresos (evita dividir por cero)", () => {
    const r = incomeStatement({ income: 0, materials: 0, labor: 0, commissions: 0, fixedExpenses: 0 });
    expect(r.netMarginPct).toBe(0);
  });

  it("utilidad puede ser negativa", () => {
    const r = incomeStatement({ income: 100, materials: 50, labor: 50, commissions: 0, fixedExpenses: 50 });
    expect(r.netProfit).toBe(-50);
  });
});

describe("channelCommission", () => {
  it("calcula comisión porcentual + fijo sobre el precio real", () => {
    expect(channelCommission(90000, 1, { commission_pct: 5, fixed_fee: 900 })).toBe(5400);
  });

  it("multiplica por la cantidad del pedido", () => {
    expect(channelCommission(10000, 3, { commission_pct: 10, fixed_fee: 0 })).toBe(3000);
  });

  it("sin canal, comisión 0", () => {
    expect(channelCommission(90000, 1, null)).toBe(0);
  });
});
