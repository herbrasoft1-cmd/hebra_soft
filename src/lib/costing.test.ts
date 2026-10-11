import { describe, expect, it } from "vitest";
import {
  averageSecondsPerPiece,
  costBreakdown,
  laborCost,
  materialsCost,
  piecesAvailable,
  simulatorPrice,
  suggestedPrice,
  suggestedPrices,
  unitCost,
} from "./costing";

describe("costeo HEBRA", () => {
  it("calcula el costo por unidad mínima (100 g a $15.000 → $150/g)", () => {
    expect(unitCost(15000, 100)).toBe(150);
    expect(unitCost(1000, 0)).toBe(0);
  });

  it("suma los materiales del osito: 45 g lana + 2 ojos + 10 g relleno", () => {
    const lines = [
      { quantity: 45, unitCost: 150 },
      { quantity: 2, unitCost: 800 },
      { quantity: 10, unitCost: 40 },
    ];
    expect(materialsCost(lines)).toBe(8750);
  });

  it("calcula la mano de obra por tiempo real", () => {
    expect(laborCost(3600 * 3 + 20 * 60, 12000)).toBe(40000);
    expect(laborCost(-5, 12000)).toBe(0);
  });

  it("aplica el desgaste de herramientas sobre materiales + mano de obra", () => {
    const b = costBreakdown({
      lines: [{ quantity: 45, unitCost: 150 }, { quantity: 2, unitCost: 800 }, { quantity: 10, unitCost: 40 }],
      laborSeconds: 12000,
      hourlyRate: 12000,
      toolWearPct: 5,
    });
    expect(b.materials).toBe(8750);
    expect(b.labor).toBe(40000);
    expect(b.wear).toBeCloseTo(2437.5);
    expect(b.total).toBeCloseTo(51187.5);
  });

  it("sugiere precios con margen, redondeados a la centena", () => {
    expect(suggestedPrice(51187.5, 50)).toBe(76800);
    expect(suggestedPrices(51187.5).map((p) => p.price)).toEqual([66600, 76800, 102400]);
  });

  it("calcula cuántas piezas alcanzan con el inventario", () => {
    expect(piecesAvailable([{ quantity: 45, remaining: 38 }, { quantity: 2, remaining: 34 }])).toBe(0);
    expect(piecesAvailable([{ quantity: 45, remaining: 190 }, { quantity: 2, remaining: 34 }])).toBe(4);
    expect(piecesAvailable([])).toBe(0);
  });
});

describe("simulador de precio (Fase 4 — margen sobre precio de venta)", () => {
  it("da exactamente $85.400 con los datos de ejemplo del roadmap (criterio de aceptación)", () => {
    const r = simulatorPrice({
      materials: 8750,
      laborSeconds: 200 * 60,
      hourlyRate: 12000,
      toolWearPct: 5,
      channel: { commissionPct: 0, fixedFee: 0 },
      marginPct: 40,
      includeIva: false,
    });
    expect(r.netPrice).toBe(85400);
    expect(r.finalPrice).toBe(85400);
  });

  it("cobra la comisión y el valor fijo del canal: precio más alto, utilidad consistente", () => {
    const sinComision = simulatorPrice({
      materials: 8750,
      laborSeconds: 200 * 60,
      hourlyRate: 12000,
      toolWearPct: 5,
      channel: { commissionPct: 0, fixedFee: 0 },
      marginPct: 40,
      includeIva: false,
    });
    const r = simulatorPrice({
      materials: 8750,
      laborSeconds: 200 * 60,
      hourlyRate: 12000,
      toolWearPct: 5,
      channel: { commissionPct: 3.49, fixedFee: 900 },
      marginPct: 40,
      includeIva: false,
    });
    expect(r.netPrice).toBeGreaterThan(sinComision.netPrice);
    expect(r.commissionAmount).toBeCloseTo(r.netPrice * 0.0349 + 900);
    expect(r.profit).toBeCloseTo(r.netPrice - r.cost - r.commissionAmount);
    // la utilidad real queda cerca del margen objetivo sobre el precio (40%)
    expect(r.profit / r.netPrice).toBeGreaterThan(0.39);
    expect(r.profit / r.netPrice).toBeLessThan(0.41);
  });

  it("suma el IVA aparte y vuelve a redondear, sin tocar la utilidad del negocio", () => {
    const sinIva = simulatorPrice({
      materials: 8750,
      laborSeconds: 200 * 60,
      hourlyRate: 12000,
      toolWearPct: 5,
      channel: { commissionPct: 0, fixedFee: 0 },
      marginPct: 40,
      includeIva: false,
    });
    const conIva = simulatorPrice({
      materials: 8750,
      laborSeconds: 200 * 60,
      hourlyRate: 12000,
      toolWearPct: 5,
      channel: { commissionPct: 0, fixedFee: 0 },
      marginPct: 40,
      includeIva: true,
    });
    expect(conIva.netPrice).toBe(sinIva.netPrice); // el precio neto no cambia
    expect(conIva.profit).toBe(sinIva.profit); // la utilidad del negocio tampoco
    expect(conIva.finalPrice).toBeGreaterThan(conIva.netPrice);
    expect(conIva.ivaAmount).toBeCloseTo(conIva.netPrice * 0.19);
  });
});

describe("averageSecondsPerPiece", () => {
  it("promedia por pieza distinta (pedido), ignorando sesiones sueltas sin pedido", () => {
    const sessions = [
      { userId: "ana", orderId: "o1", seconds: 3000 },
      { userId: "ana", orderId: "o1", seconds: 200 }, // misma pieza, pausa/reanuda
      { userId: "ana", orderId: "o2", seconds: 3600 },
      { userId: "ana", orderId: null, seconds: 99999 }, // suelta de Recetario, no cuenta
      { userId: "lina", orderId: "o3", seconds: 5000 },
    ];
    const result = averageSecondsPerPiece(sessions);
    const ana = result.find((r) => r.userId === "ana")!;
    expect(ana.pieces).toBe(2);
    expect(ana.avgSeconds).toBe((3200 + 3600) / 2);
    const lina = result.find((r) => r.userId === "lina")!;
    expect(lina.pieces).toBe(1);
  });

  it("devuelve una lista vacía si no hay sesiones vinculadas a un pedido", () => {
    expect(averageSecondsPerPiece([{ userId: "ana", orderId: null, seconds: 100 }])).toEqual([]);
  });
});
