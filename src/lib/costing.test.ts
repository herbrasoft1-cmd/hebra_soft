import { describe, expect, it } from "vitest";
import {
  costBreakdown,
  laborCost,
  materialsCost,
  piecesAvailable,
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
