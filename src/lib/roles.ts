import type { Role } from "./types";

export const ROLE_LABEL: Record<Role, string> = {
  owner: "Dueño",
  admin: "Administrador",
  staff: "Personal",
};

export const ROLE_OPTIONS: Role[] = ["admin", "staff"];
