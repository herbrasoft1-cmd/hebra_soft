"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { ProductVersion } from "@/lib/types";

export async function createProduct(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para crear patrones.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const { data, error } = await supabase
    .from("products")
    .insert({ name, category: String(formData.get("category") ?? "").trim() || null, tenant_id: tenant.id })
    .select("id")
    .single();
  if (error || !data) throw new Error("No se pudo crear el patrón");
  revalidatePath("/recetario");
  redirect(`/recetario/${data.id}`);
}

export async function updateProduct(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para editar este patrón.");
  const id = String(formData.get("id"));
  const patch: Record<string, unknown> = {};
  for (const key of ["name", "category", "notes"] as const) {
    if (formData.has(key)) patch[key] = String(formData.get(key) ?? "").trim() || null;
  }
  if (formData.has("target_margin_pct")) patch.target_margin_pct = Number(formData.get("target_margin_pct"));
  if (formData.has("sale_price")) patch.sale_price = Number(formData.get("sale_price"));
  if (formData.has("labor_minutes")) patch.labor_seconds = Math.round(Number(formData.get("labor_minutes")) * 60);

  const { error } = await supabase.from("products").update(patch).eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo guardar el patrón.");
  revalidatePath(`/recetario/${id}`);
  revalidatePath("/recetario");
}

/** Clona un patrón completo (receta + insumos) como punto de partida para una variante nueva
 * (ej. "Osito café" → "Osito café (copia)"), sin publicar ninguna versión todavía — el precio
 * sugerido queda igual al original hasta que alguien lo ajuste y publique de nuevo. */
export async function duplicateProduct(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para duplicar patrones.");
  const id = String(formData.get("id"));

  const { data: original, error: fetchError } = await supabase
    .from("products")
    .select("name, category, notes, labor_seconds, target_margin_pct, sale_price")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();
  if (fetchError || !original) throw new Error("No se encontró el patrón a duplicar.");

  const { data: lines } = await supabase.from("product_supplies").select("supply_id, quantity").eq("product_id", id);

  const { data: copy, error: insertError } = await supabase
    .from("products")
    .insert({ ...original, name: `${original.name} (copia)`, tenant_id: tenant.id })
    .select("id")
    .single();
  if (insertError || !copy) throw new Error("No se pudo duplicar el patrón.");

  if (lines && lines.length > 0) {
    const { error: linesError } = await supabase
      .from("product_supplies")
      .insert(lines.map((l) => ({ tenant_id: tenant.id, product_id: copy.id, supply_id: l.supply_id, quantity: l.quantity })));
    if (linesError) throw new Error("El patrón se duplicó, pero no se pudieron copiar sus insumos.");
  }

  revalidatePath("/recetario");
  redirect(`/recetario/${copy.id}`);
}

export async function deleteProduct(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para eliminar este patrón.");
  const id = String(formData.get("id"));
  const { error } = await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo eliminar el patrón.");
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "product", entityId: id });
  revalidatePath("/recetario");
  redirect("/recetario");
}

/** Agrega (o actualiza) un insumo dentro del patrón. */
export async function upsertRecipeLine(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para editar este patrón.");
  const productId = String(formData.get("product_id"));
  const supplyId = String(formData.get("supply_id"));
  const quantity = Number(String(formData.get("quantity") ?? "").replace(",", "."));
  if (!supplyId || !(quantity > 0)) return;

  const { error } = await supabase.from("product_supplies").upsert(
    { tenant_id: tenant.id, product_id: productId, supply_id: supplyId, quantity },
    { onConflict: "product_id,supply_id" },
  );
  if (error) throw new Error("No se pudo agregar el insumo al patrón.");
  revalidatePath(`/recetario/${productId}`);
}

export async function removeRecipeLine(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para editar este patrón.");
  const productId = String(formData.get("product_id"));
  const { error } = await supabase
    .from("product_supplies")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo quitar el insumo del patrón.");
  revalidatePath(`/recetario/${productId}`);
}

/** Lo llama el cronómetro (también al sincronizar sesiones que quedaron offline). */
export async function logTimerSession(s: {
  clientId: string;
  productId: string;
  orderId?: string;
  seconds: number;
  startedAt: string;
  endedAt: string;
}) {
  const { supabase, role } = await getSession();
  if (!canFully(role, "use_timer")) throw new Error("No tienes permiso para usar el cronómetro.");
  const { error } = await supabase.rpc("log_timer_session", {
    p_product_id: s.productId,
    p_seconds: s.seconds,
    p_started_at: s.startedAt,
    p_ended_at: s.endedAt,
    p_client_id: s.clientId,
    p_order_id: s.orderId ?? null,
  });
  if (error) throw new Error(error.message);
  if (s.orderId) revalidatePath("/pedidos");
  revalidatePath(`/recetario/${s.productId}`);
  revalidatePath("/recetario");
}

/** Agrega un paso al patrón (lo tilda la tejedora desde "Mi turno", Fase 8). */
export async function addProductStep(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para editar este patrón.");
  const productId = String(formData.get("product_id"));
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const detail = String(formData.get("detail") ?? "").trim() || null;
  const { count } = await supabase.from("product_steps").select("id", { count: "exact", head: true }).eq("product_id", productId);

  const { error } = await supabase
    .from("product_steps")
    .insert({ tenant_id: tenant.id, product_id: productId, name, detail, position: count ?? 0 });
  if (error) throw new Error("No se pudo agregar el paso.");
  revalidatePath(`/recetario/${productId}`);
}

export async function removeProductStep(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para editar este patrón.");
  const productId = String(formData.get("product_id"));
  const { error } = await supabase
    .from("product_steps")
    .delete()
    .eq("id", String(formData.get("id")))
    .eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo quitar el paso.");
  revalidatePath(`/recetario/${productId}`);
}

/** "Publicar precio" del simulador: crea una versión nueva y actualiza el precio vigente del patrón. */
export async function publishProductVersion(input: {
  productId: string;
  materialsCost: number;
  laborCost: number;
  wearCost: number;
  hourlyRate: number;
  laborSeconds: number;
  channelName: string | null;
  commissionPct: number;
  fixedFee: number;
  marginPct: number;
  ivaIncluded: boolean;
  netPrice: number;
}): Promise<ProductVersion> {
  const { supabase, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para publicar un precio.");
  const { data, error } = await supabase.rpc("publish_product_version", {
    p_product_id: input.productId,
    p_materials_cost: input.materialsCost,
    p_labor_cost: input.laborCost,
    p_wear_cost: input.wearCost,
    p_hourly_rate: input.hourlyRate,
    p_labor_seconds: Math.round(input.laborSeconds),
    p_channel_name: input.channelName,
    p_commission_pct: input.commissionPct,
    p_fixed_fee: input.fixedFee,
    p_margin_pct: input.marginPct,
    p_iva_included: input.ivaIncluded,
    p_net_price: input.netPrice,
  });
  if (error || !data) throw new Error(error?.message ?? "No se pudo publicar el precio.");
  revalidatePath(`/recetario/${input.productId}`);
  revalidatePath("/recetario");
  revalidatePath("/inicio");
  return data as ProductVersion;
}
