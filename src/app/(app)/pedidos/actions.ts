"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getActiveLocationId } from "@/lib/location";
import { getSession } from "@/lib/tenant";
import type { OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];

function revalidate() {
  revalidatePath("/pedidos");
  revalidatePath("/inicio");
  revalidatePath("/insumos");
}

export async function saveOrder(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id") ?? "");

  // Cliente: uno existente o uno nuevo creado al vuelo
  let customerId = String(formData.get("customer_id") ?? "") || null;
  const newCustomer = String(formData.get("new_customer_name") ?? "").trim();
  if (!customerId && newCustomer) {
    const { data, error } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenant.id,
        name: newCustomer,
        whatsapp: String(formData.get("new_customer_whatsapp") ?? "").trim() || null,
        instagram: String(formData.get("new_customer_instagram") ?? "").trim() || null,
      })
      .select("id")
      .single();
    if (error) throw new Error("No se pudo crear el cliente nuevo.");
    customerId = data?.id ?? null;
  }

  const record = {
    customer_id: customerId,
    product_id: String(formData.get("product_id") ?? "") || null,
    title: String(formData.get("title") ?? "").trim(),
    details: String(formData.get("details") ?? "").trim() || null,
    quantity: Math.max(1, Number(formData.get("quantity") ?? 1)),
    price: Number(formData.get("price") ?? 0),
    due_date: String(formData.get("due_date") ?? "") || null,
    paid: formData.get("paid") === "on",
  };
  if (!record.title) return;

  if (id) {
    const { error } = await supabase.from("orders").update(record).eq("id", id).eq("tenant_id", tenant.id);
    if (error) throw new Error("No se pudo guardar el pedido.");
  } else {
    const location_id = await getActiveLocationId();
    const { error } = await supabase
      .from("orders")
      .insert({ ...record, tenant_id: tenant.id, status: "espera", location_id });
    if (error) throw new Error("No se pudo crear el pedido.");
  }
  revalidate();
}

export async function moveOrder(id: string, status: OrderStatus) {
  if (!STATUSES.includes(status)) return;
  const { supabase, tenant } = await getSession();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo mover el pedido.");
  revalidate();
}

export async function deleteOrder(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("orders").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo eliminar el pedido.");
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "order", entityId: id });
  revalidate();
}

/** Marca el pedido como pagado y lo registra como ingreso en la caja (una sola transacción en la base). */
export async function markPaid(formData: FormData) {
  const { supabase } = await getSession();
  const id = String(formData.get("id"));
  const method = String(formData.get("payment_method") ?? "Transferencia");
  const { error } = await supabase.rpc("mark_order_paid", { p_order_id: id, p_payment_method: method });
  if (error) throw new Error("No se pudo registrar el pago.");
  revalidate();
  revalidatePath("/caja");
}
