"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";

export async function updateTenant(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const { error } = await supabase
    .from("tenants")
    .update({
      name: String(formData.get("name") ?? tenant.name).trim() || tenant.name,
      industry: String(formData.get("industry") ?? tenant.industry),
      hourly_rate: Number(formData.get("hourly_rate") ?? tenant.hourly_rate),
      tool_wear_pct: Number(formData.get("tool_wear_pct") ?? tenant.tool_wear_pct),
      whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
      instagram: String(formData.get("instagram") ?? "").trim().replace(/^@/, "") || null,
    })
    .eq("id", tenant.id);
  if (error) throw new Error("No se pudo guardar la configuración.");
  await logAudit(supabase, { tenantId: tenant.id, action: "update_tenant", entityType: "tenant", entityId: tenant.id });
  revalidatePath("/", "layout");
}

/** Sube el logo a Storage (logos/<tenant_id>/logo.ext) para usarlo en las remisiones. */
export async function uploadLogo(formData: FormData): Promise<{ error?: string }> {
  const { supabase, tenant } = await getSession();
  const file = formData.get("logo");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };
  if (file.size > 1_500_000) return { error: "La imagen debe pesar menos de 1,5 MB." };
  if (!["image/png", "image/jpeg"].includes(file.type)) return { error: "Usa PNG o JPG." };

  const path = `${tenant.id}/logo.${file.type === "image/png" ? "png" : "jpg"}`;
  const { error } = await supabase.storage.from("logos").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error: "No se pudo subir el logo." };

  const { data } = supabase.storage.from("logos").getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("tenants")
    .update({ logo_url: `${data.publicUrl}?v=${Date.now()}` })
    .eq("id", tenant.id);
  if (updateError) return { error: "El logo se subió pero no se pudo guardar. Intenta de nuevo." };
  revalidatePath("/configuracion");
  return {};
}

export async function createLocation(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Escribe un nombre para la sede.");
  const { error } = await supabase.from("locations").insert({ tenant_id: tenant.id, name });
  if (error) throw new Error("No se pudo crear la sede.");
  await logAudit(supabase, { tenantId: tenant.id, action: "create_location", entityType: "location", metadata: { name } });
  revalidatePath("/", "layout");
}

export async function createSalesChannel(formData: FormData) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "edit_recipes")) throw new Error("No tienes permiso para configurar canales de venta.");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Escribe un nombre para el canal.");
  const commission_pct = Number(formData.get("commission_pct") ?? 0) || 0;
  const fixed_fee = Number(formData.get("fixed_fee") ?? 0) || 0;
  const { error } = await supabase.from("sales_channels").insert({ tenant_id: tenant.id, name, commission_pct, fixed_fee });
  if (error) throw new Error("No se pudo crear el canal.");
  await logAudit(supabase, { tenantId: tenant.id, action: "create_sales_channel", entityType: "sales_channel", metadata: { name } });
  revalidatePath("/", "layout");
}
