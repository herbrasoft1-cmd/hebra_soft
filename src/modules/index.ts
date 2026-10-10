/**
 * Módulos de industria (core genérico + plugins).
 *
 * El núcleo de HEBRA (insumos, pedidos, caja) es igual para cualquier negocio handmade.
 * Lo que cambia por nicho es el vocabulario del "Recetario", los estados de producción
 * y las unidades sugeridas. Para sumar un nicho nuevo (joyería, cerámica, costura…)
 * se agrega un archivo en esta carpeta y se registra abajo: no se toca el core.
 */
import type { OrderStatus, Unit } from "@/lib/types";
import { crochet } from "./crochet";
import { jewelry } from "./jewelry";

export type IndustryModule = {
  id: string;
  name: string;
  recipe: {
    menuLabel: string; // "Recetario"
    itemLabel: string; // "Patrón" / "Fórmula"
    itemPlural: string;
    exampleName: string;
  };
  timer: { label: string; activeVerb: string };
  statusLabels: Record<OrderStatus, string>;
  defaultUnits: Unit[];
  supplyExamples: string;
};

const REGISTRY: Record<string, IndustryModule> = {
  [crochet.id]: crochet,
  [jewelry.id]: jewelry,
};

export function getIndustryModule(id: string | null | undefined): IndustryModule {
  return REGISTRY[id ?? ""] ?? crochet;
}

export const INDUSTRY_OPTIONS = Object.values(REGISTRY).map((m) => ({ id: m.id, name: m.name }));
