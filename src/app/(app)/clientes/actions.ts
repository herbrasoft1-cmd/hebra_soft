"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/tenant";

export async function saveCustomer(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id") ?? "");
  const record = {
    name: String(formData.get("name") ?? "").trim(),
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    instagram: String(formData.get("instagram") ?? "").trim().replace(/^@/, "") || null,
    address: String(formData.get("address") ?? "").trim() || null,
    document_number: String(formData.get("document_number") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
  };
  if (!record.name) return;
  const { error } = id
    ? await supabase.from("customers").update(record).eq("id", id).eq("tenant_id", tenant.id)
    : await supabase.from("customers").insert({ ...record, tenant_id: tenant.id });
  if (error) throw new Error("No se pudo guardar el cliente.");
  revalidatePath("/clientes");
  revalidatePath("/pedidos");
}

export async function deleteCustomer(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("customers").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo eliminar el cliente.");
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "customer", entityId: id });
  revalidatePath("/clientes");
}
