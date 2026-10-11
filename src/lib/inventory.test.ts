import { describe, expect, it } from "vitest";
import { blockedOrders, needsReorder, suggestTransfer, type BlockedOrder, type LocationStock } from "./inventory";

describe("needsReorder", () => {
  it("es true cuando el stock cae al punto de reorden o menos", () => {
    expect(needsReorder(5, 10)).toBe(true);
    expect(needsReorder(10, 10)).toBe(true);
    expect(needsReorder(15, 10)).toBe(false);
  });
  it("es false si no hay un punto de reorden configurado (0)", () => {
    expect(needsReorder(0, 0)).toBe(false);
  });
});

describe("blockedOrders", () => {
  it("marca un pedido cuya receta necesita más insumo del disponible en su sede", () => {
    const orders = [
      {
        id: "1",
        title: "Gorro x2",
        locationId: "bog",
        status: "proceso",
        quantity: 2,
        lines: [{ supplyName: "Lana mostaza", neededPerPiece: 300 }],
      },
    ];
    const stock = new Map([["Lana mostaza\u0000bog", 200]]);
    const items = blockedOrders(orders, stock);
    expect(items).toEqual([{ orderId: "1", orderTitle: "Gorro x2", locationId: "bog", supplyName: "Lana mostaza", neededQuantity: 400 }]);
  });

  it("no marca pedidos enviados ni los que sí alcanzan", () => {
    const orders = [
      { id: "1", title: "A", locationId: "bog", status: "enviado", quantity: 1, lines: [{ supplyName: "X", neededPerPiece: 1000 }] },
      { id: "2", title: "B", locationId: "bog", status: "proceso", quantity: 1, lines: [{ supplyName: "Y", neededPerPiece: 10 }] },
    ];
    const stock = new Map([["Y\u0000bog", 50]]);
    expect(blockedOrders(orders, stock)).toEqual([]);
  });
});

describe("suggestTransfer", () => {
  it("sugiere mover desde la sede con excedente a la que tiene el pedido bloqueado", () => {
    const stock: LocationStock[] = [
      { locationId: "med", locationName: "Medellín", supplyId: "s-med", supplyName: "Lana mostaza", remaining: 1250, threshold: 400 },
      { locationId: "bog", locationName: "Bogotá", supplyId: "s-bog", supplyName: "Lana mostaza", remaining: 0, threshold: 400 },
    ];
    const blocked: BlockedOrder[] = [{ orderId: "1270", orderTitle: "Gorro de lana x2", locationId: "bog", supplyName: "Lana mostaza", neededQuantity: 500 }];
    const suggestion = suggestTransfer(stock, blocked);
    expect(suggestion).toEqual({
      fromSupplyId: "s-med",
      fromLocationName: "Medellín",
      toLocationId: "bog",
      toLocationName: "Bogotá",
      supplyName: "Lana mostaza",
      quantity: 500,
      orderTitle: "Gorro de lana x2",
    });
  });

  it("no sugiere nada si ninguna sede tiene excedente suficiente", () => {
    const stock: LocationStock[] = [{ locationId: "med", locationName: "Medellín", supplyId: "s-med", supplyName: "Lana mostaza", remaining: 450, threshold: 400 }];
    const blocked: BlockedOrder[] = [{ orderId: "1", orderTitle: "X", locationId: "bog", supplyName: "Lana mostaza", neededQuantity: 500 }];
    expect(suggestTransfer(stock, blocked)).toBeNull();
  });

  it("no sugiere nada si no hay pedidos bloqueados", () => {
    expect(suggestTransfer([], [])).toBeNull();
  });
});
