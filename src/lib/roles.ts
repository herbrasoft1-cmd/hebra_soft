import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Titular",
  admin: "Administración",
  ventas: "Ventas",
  tejedora: "Tejedora",
};

export const ROLE_OPTIONS: Role[] = ["admin", "ventas", "tejedora"];
