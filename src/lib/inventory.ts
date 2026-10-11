/**
 * Cálculos de inventario multisede (Fase 5): funciones puras, sin dependencias
 * de Supabase, para poder probarlas con Vitest.
 */

export function needsReorder(quantityRemaining: number, threshold: number): boolean {
  return threshold > 0 && quantityRemaining <= threshold;
}

export type LocationStock = {
  locationId: string;
  locationName: string;
  supplyId: string;
  supplyName: string;
  remaining: number;
  threshold: number;
};

export type BlockedOrder = {
  orderId: string;
  orderTitle: string;
  locationId: string;
  supplyName: string;
  neededQuantity: number;
};

export type TransferSuggestion = {
  fromSupplyId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  supplyName: string;
  quantity: number;
  orderTitle: string;
} | null;

/**
 * Heurística simple y explicable: una sede con excedente real (por encima de su
 * propio punto de reorden) del mismo insumo que tiene bloqueado un pedido en
 * otra sede → sugiere mover justo lo que hace falta para desbloquearlo. null si
 * no hay una sugerencia razonable — nunca se inventa una.
 */
export function suggestTransfer(stock: LocationStock[], blocked: BlockedOrder[]): TransferSuggestion {
  for (const b of blocked) {
    const surplus = stock
      .filter((s) => s.supplyName === b.supplyName && s.locationId !== b.locationId)
      .map((s) => ({ ...s, spare: s.remaining - s.threshold }))
      .filter((s) => s.spare >= b.neededQuantity)
      .sort((a, c) => c.spare - a.spare)[0];
    if (surplus) {
      const destLocationName = stock.find((s) => s.locationId === b.locationId)?.locationName ?? "";
      return {
        fromSupplyId: surplus.supplyId,
        fromLocationName: surplus.locationName,
        toLocationId: b.locationId,
        toLocationName: destLocationName,
        supplyName: b.supplyName,
        quantity: b.neededQuantity,
        orderTitle: b.orderTitle,
      };
    }
  }
  return null;
}

export type OrderWithRecipe = {
  id: string;
  title: string;
  locationId: string | null;
  status: string;
  quantity: number;
  lines: { supplyName: string; neededPerPiece: number }[];
};

/** Pedidos activos cuya receta necesita más de un insumo del que hay disponible en su sede. */
export function blockedOrders(orders: OrderWithRecipe[], stockBySupplyAndLocation: Map<string, number>): BlockedOrder[] {
  const items: BlockedOrder[] = [];
  for (const o of orders) {
    if (o.status === "enviado" || !o.locationId) continue;
    for (const line of o.lines) {
      const needed = line.neededPerPiece * o.quantity;
      const available = stockBySupplyAndLocation.get(`${line.supplyName}\u0000${o.locationId}`) ?? 0;
      if (needed > available) {
        items.push({ orderId: o.id, orderTitle: o.title, locationId: o.locationId, supplyName: line.supplyName, neededQuantity: needed - available });
      }
    }
  }
  return items;
}
