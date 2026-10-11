import type { Role } from "./types";

export type Permission =
  | "view_costs"
  | "edit_recipes"
  | "manage_orders"
  | "use_timer"
  | "issue_invoices"
  | "view_finance"
  | "approve_purchase_orders"
  | "manage_team";

export type PermissionValue = boolean | "own";

export const PERMISSION_LABEL: Record<Permission, string> = {
  view_costs: "Ver costos y márgenes",
  edit_recipes: "Editar recetario y precios",
  manage_orders: "Crear y mover pedidos",
  use_timer: "Usar cronómetro de talento",
  issue_invoices: "Emitir facturas y remisiones",
  view_finance: "Ver finanzas y cartera",
  approve_purchase_orders: "Aprobar órdenes de compra",
  manage_team: "Gestionar equipo y permisos",
};

export const ROLES_IN_ORDER: Role[] = ["owner", "admin", "ventas", "tejedora"];

export const PERMISSIONS_IN_ORDER: Permission[] = [
  "view_costs",
  "edit_recipes",
  "manage_orders",
  "use_timer",
  "issue_invoices",
  "view_finance",
  "approve_purchase_orders",
  "manage_team",
];

/**
 * Matriz exacta de la pestaña "Roles y permisos" de docs/mockups/Ent-Equipo.dc.html.
 * Columnas en orden: owner, admin, ventas, tejedora. "own" = solo lo propio.
 */
const MATRIX: Record<Permission, Record<Role, PermissionValue>> = {
  view_costs: { owner: true, admin: true, ventas: false, tejedora: false },
  edit_recipes: { owner: true, admin: true, ventas: false, tejedora: false },
  manage_orders: { owner: true, admin: true, ventas: true, tejedora: "own" },
  use_timer: { owner: true, admin: true, ventas: false, tejedora: true },
  issue_invoices: { owner: true, admin: true, ventas: true, tejedora: false },
  view_finance: { owner: true, admin: true, ventas: false, tejedora: false },
  approve_purchase_orders: { owner: true, admin: "own", ventas: false, tejedora: false },
  manage_team: { owner: true, admin: false, ventas: false, tejedora: false },
};

export function can(role: Role, permission: Permission): PermissionValue {
  return MATRIX[permission][role];
}

/** true solo si el permiso es un sí sin restricciones (no cuenta "own"). */
export function canFully(role: Role, permission: Permission): boolean {
  return can(role, permission) === true;
}

export function permissionMatrix(): { permission: Permission; label: string; values: PermissionValue[] }[] {
  return PERMISSIONS_IN_ORDER.map((permission) => ({
    permission,
    label: PERMISSION_LABEL[permission],
    values: ROLES_IN_ORDER.map((role) => can(role, permission)),
  }));
}
