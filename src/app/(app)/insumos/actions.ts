"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/tenant";
import type { Unit } from "@/lib/types";

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
    remaining: formData.has("quantity_remaining") ? num(formData.get("quantity_remaining")) : quantity,
  };
}

export async function saveSupply(formData: FormData) {
  const { supabase, tenant } = await getSession();
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
    const { error } = await supabase
      .from("supplies")
      .insert({ ...data, quantity_remaining: remaining, tenant_id: tenant.id });
    if (error) throw new Error("No se pudo crear el insumo.");
  }
  revalidatePath("/insumos");
  revalidatePath("/inicio");
}

export async function deleteSupply(formData: FormData): Promise<{ error?: string }> {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("supplies").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) return { error: "No se puede eliminar: el insumo está en algún patrón del recetario." };
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "supply", entityId: id });
  revalidatePath("/insumos");
  return {};
}
