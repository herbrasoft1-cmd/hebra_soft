"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getActiveLocationId } from "@/lib/location";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { PurchaseOrderStatus, Unit } from "@/lib/types";

function num(v: FormDataEntryValue | null): number {
  return Number(String(v ?? "").replace(",", ".")) || 0;
}

function parse(formData: FormData) {
  const quantity = num(formData.get("quantity_purchased"));
  return {
    name: String(formData.get("name") ?? "").trim(),
    brand: String(formData.get("brand") ?? "").trim() || null,
    lot_color: String(formData.get("lot_color") ?? "").trim() || null,
    unit: String(formData.get("unit") ?? "g") as Unit,
    quantity_purchased: quantity,
    total_cost: num(formData.get("total_cost")),
    low_stock_threshold: num(formData.get("low_stock_threshold")),
    supplier_id: String(formData.get("supplier_id") ?? "") || null,
    remaining: formData.has("quantity_remaining") ? num(formData.get("quantity_remaining")) : quantity,
  };
}

export async function saveSupply(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para registrar compras de insumos.");
  const id = String(formData.get("id") ?? "");
  const { remaining, ...data } = parse(formData);
  if (!data.name || data.quantity_purchased <= 0) throw new Error("Nombre y cantidad son obligatorios");

  if (id) {
    const { error } = await supabase
      .from("supplies")
      .update({ ...data, quantity_remaining: remaining })
      .eq("id", id)
      .eq("tenant_id", tenant.id);
    if (error) throw new Error("No se pudo guardar el insumo.");
  } else {
    const location_id = await getActiveLocationId();
    const { error } = await supabase
      .from("supplies")
      .insert({ ...data, quantity_remaining: remaining, tenant_id: tenant.id, location_id });
    if (error) throw new Error("No se pudo crear el insumo.");
  }
  revalidatePath("/insumos");
  revalidatePath("/inicio");
}

export async function deleteSupply(formData: FormData): Promise<{ error?: string }> {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) return { error: "No tienes permiso para eliminar insumos." };
  const id = String(formData.get("id"));
  const { error } = await supabase.from("supplies").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { error: "No se puede eliminar: el insumo está en algún patrón del recetario." };
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "supply", entityId: id });
  revalidatePath("/insumos");
  return {};
}

export async function createSupplier(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para registrar proveedores.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Escribe un nombre para el proveedor.");
  const contact = String(formData.get("contact") ?? "").trim() || null;
  const { error } = await supabase.from("suppliers").insert({ tenant_id: tenant.id, name, contact });
  if (error) throw new Error("No se pudo crear el proveedor.");
  revalidatePath("/insumos");
}

export async function createPurchaseOrder(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para crear órdenes de compra.");
  const supplierId = String(formData.get("supplier_id") ?? "") || null;
  const supplyId = String(formData.get("supply_id") ?? "");
  const quantity = num(formData.get("quantity"));
  const unitCost = num(formData.get("unit_cost"));
  if (!supplyId || quantity <= 0) throw new Error("Elige un insumo y una cantidad válida.");

  const location_id = await getActiveLocationId();
  const { data: po, error } = await supabase
    .from("purchase_orders")
    .insert({ tenant_id: tenant.id, location_id, supplier_id: supplierId, status: "borrador" })
    .select("id")
    .single();
  if (error || !po) throw new Error("No se pudo crear la orden de compra.");

  const { error: lineError } = await supabase
    .from("purchase_order_lines")
    .insert({ tenant_id: tenant.id, purchase_order_id: po.id, supply_id: supplyId, quantity, unit_cost: unitCost });
  if (lineError) throw new Error("No se pudo agregar la línea a la orden de compra.");

  await logAudit(supabase, { tenantId: tenant.id, action: "create_purchase_order", entityType: "purchase_order", entityId: po.id });
  revalidatePath("/insumos");
}

export async function advancePurchaseOrder(poId: string, newStatus: PurchaseOrderStatus) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para avanzar órdenes de compra.");
  const { error } = await supabase.rpc("advance_purchase_order", { p_po_id: poId, p_new_status: newStatus });
  if (error) throw new Error(error.message);
  await logAudit(supabase, { tenantId: tenant.id, action: "advance_purchase_order", entityType: "purchase_order", entityId: poId, metadata: { newStatus } });
  revalidatePath("/insumos");
  revalidatePath("/inicio");
  revalidatePath("/recetario");
}

export async function createTransfer(fromSupplyId: string, toLocationId: string, quantity: number) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para transferir insumos.");
  if (!fromSupplyId || !toLocationId || quantity <= 0) throw new Error("Datos de transferencia inválidos.");
  const { data: t, error } = await supabase
    .from("stock_transfers")
    .insert({ tenant_id: tenant.id, from_supply_id: fromSupplyId, to_location_id: toLocationId, quantity })
    .select("id")
    .single();
  if (error || !t) throw new Error("No se pudo crear la transferencia.");
  const { error: completeError } = await supabase.rpc("complete_transfer", { p_transfer_id: t.id });
  if (completeError) throw new Error(completeError.message);
  await logAudit(supabase, { tenantId: tenant.id, action: "complete_transfer", entityType: "stock_transfer", entityId: t.id });
  revalidatePath("/insumos");
  revalidatePath("/inicio");
}
