import { describe, expect, it } from "vitest";
import { computeSaldo, goalProgress } from "./tracking";

describe("computeSaldo", () => {
  it("resta los ingresos del total", () => {
    expect(computeSaldo(185000, [92500])).toBe(92500);
  });

  it("sin abonos, el saldo es el total", () => {
    expect(computeSaldo(185000, [])).toBe(185000);
  });

  it("nunca es negativo aunque se registre de más", () => {
    expect(computeSaldo(100000, [60000, 60000])).toBe(0);
  });

  it("suma varios abonos parciales", () => {
    expect(computeSaldo(185000, [50000, 42500])).toBe(92500);
  });
});

describe("goalProgress", () => {
  it("calcula el porcentaje contra la meta", () => {
    expect(goalProgress(6000, 12000)).toEqual({ pct: 50, over: false });
  });

  it("marca over cuando se pasó la meta, tope visual en 100%", () => {
    expect(goalProgress(15000, 12000)).toEqual({ pct: 100, over: true });
  });

  it("meta en cero no divide por cero", () => {
    expect(goalProgress(500, 0)).toEqual({ pct: 0, over: false });
  });

  it("en cero segundos, 0%", () => {
    expect(goalProgress(0, 12000)).toEqual({ pct: 0, over: false });
  });
});
