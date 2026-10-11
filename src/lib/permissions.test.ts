import { describe, expect, it } from "vitest";
import { can, canFully } from "./permissions";

describe("permisos HEBRA (matriz exacta de Ent-Equipo.dc.html)", () => {
  it("ver costos y márgenes: solo propietaria y administración", () => {
    expect(can("owner", "view_costs")).toBe(true);
    expect(can("admin", "view_costs")).toBe(true);
    expect(can("ventas", "view_costs")).toBe(false);
    expect(can("tejedora", "view_costs")).toBe(false);
  });

  it("editar recetario y precios: solo propietaria y administración", () => {
    expect(can("owner", "edit_recipes")).toBe(true);
    expect(can("admin", "edit_recipes")).toBe(true);
    expect(can("ventas", "edit_recipes")).toBe(false);
    expect(can("tejedora", "edit_recipes")).toBe(false);
  });

  it("crear y mover pedidos: todas sí, tejedora solo los propios", () => {
    expect(can("owner", "manage_orders")).toBe(true);
    expect(can("admin", "manage_orders")).toBe(true);
    expect(can("ventas", "manage_orders")).toBe(true);
    expect(can("tejedora", "manage_orders")).toBe("own");
  });

  it("usar cronómetro de talento: propietaria, administración y tejedora, no ventas", () => {
    expect(can("owner", "use_timer")).toBe(true);
    expect(can("admin", "use_timer")).toBe(true);
    expect(can("ventas", "use_timer")).toBe(false);
    expect(can("tejedora", "use_timer")).toBe(true);
  });

  it("emitir facturas y remisiones: propietaria, administración y ventas, no tejedora", () => {
    expect(can("owner", "issue_invoices")).toBe(true);
    expect(can("admin", "issue_invoices")).toBe(true);
    expect(can("ventas", "issue_invoices")).toBe(true);
    expect(can("tejedora", "issue_invoices")).toBe(false);
  });

  it("ver finanzas y cartera: solo propietaria y administración", () => {
    expect(can("owner", "view_finance")).toBe(true);
    expect(can("admin", "view_finance")).toBe(true);
    expect(can("ventas", "view_finance")).toBe(false);
    expect(can("tejedora", "view_finance")).toBe(false);
  });

  it("aprobar órdenes de compra: propietaria sin límite, administración solo las propias", () => {
    expect(can("owner", "approve_purchase_orders")).toBe(true);
    expect(can("admin", "approve_purchase_orders")).toBe("own");
    expect(can("ventas", "approve_purchase_orders")).toBe(false);
    expect(can("tejedora", "approve_purchase_orders")).toBe(false);
  });

  it("gestionar equipo y permisos: solo la propietaria, ni siquiera administración", () => {
    expect(can("owner", "manage_team")).toBe(true);
    expect(can("admin", "manage_team")).toBe(false);
    expect(can("ventas", "manage_team")).toBe(false);
    expect(can("tejedora", "manage_team")).toBe(false);
  });

  it("canFully trata 'own' como no autorizado sin restricciones", () => {
    expect(canFully("tejedora", "manage_orders")).toBe(false);
    expect(canFully("admin", "approve_purchase_orders")).toBe(false);
    expect(canFully("owner", "approve_purchase_orders")).toBe(true);
  });
});
