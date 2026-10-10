"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/tenant";

export async function createProduct(formData: FormData) {
  const { supabase, tenant } = await getSession();
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
  const { supabase, tenant } = await getSession();
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

export async function deleteProduct(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("products").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo eliminar el patrón.");
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "product", entityId: id });
  revalidatePath("/recetario");
  redirect("/recetario");
}

/** Agrega (o actualiza) un insumo dentro del patrón. */
export async function upsertRecipeLine(formData: FormData) {
  const { supabase, tenant } = await getSession();
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
  const { supabase, tenant } = await getSession();
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
  seconds: number;
  startedAt: string;
  endedAt: string;
}) {
  const { supabase } = await getSession();
  const { error } = await supabase.rpc("log_timer_session", {
    p_product_id: s.productId,
    p_seconds: s.seconds,
    p_started_at: s.startedAt,
    p_ended_at: s.endedAt,
    p_client_id: s.clientId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/recetario/${s.productId}`);
  revalidatePath("/recetario");
}
