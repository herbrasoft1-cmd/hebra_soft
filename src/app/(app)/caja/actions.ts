"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getActiveLocationId } from "@/lib/location";
import { getSession } from "@/lib/tenant";

/** Registro rápido de ingreso o gasto (un toque desde Inicio). */
export async function addTransaction(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const { supabase, tenant } = await getSession();
  const amount = Number(formData.get("amount") ?? 0);
  if (!(amount > 0)) return { ok: false, error: "Escribe un valor mayor a cero." };
  const location_id = await getActiveLocationId();
  const { error } = await supabase.from("transactions").insert({
    tenant_id: tenant.id,
    type: formData.get("type") === "gasto" ? "gasto" : "ingreso",
    category: String(formData.get("category") ?? "Venta"),
    description: String(formData.get("description") ?? "").trim() || null,
    amount,
    payment_method: String(formData.get("payment_method") ?? "") || null,
    occurred_on: String(formData.get("occurred_on") ?? "") || new Date().toISOString().slice(0, 10),
    location_id,
  });
  if (error) return { ok: false, error: "No se pudo guardar el movimiento." };
  revalidatePath("/caja");
  revalidatePath("/inicio");
  return { ok: true };
}

export async function deleteTransaction(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const { error } = await supabase.from("transactions").delete().eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo eliminar el movimiento.");
  await logAudit(supabase, { tenantId: tenant.id, action: "delete", entityType: "transaction", entityId: id });
  revalidatePath("/caja");
  revalidatePath("/inicio");
}

/** Reserva el consecutivo y devuelve todo lo necesario para dibujar el PDF en el navegador. */
export async function createRemission(orderId: string, paymentMethod: string) {
  const { supabase, tenant } = await getSession();
  const { data: rem, error } = await supabase.rpc("create_remission", {
    p_order_id: orderId,
    p_payment_method: paymentMethod,
  });
  if (error || !rem) return { error: "No se pudo crear la remisión." };

  const { data: order } = await supabase
    .from("orders")
    .select("title, details, quantity, price, customers(name, whatsapp, address)")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .single();
  if (!order) return { error: "Pedido no encontrado." };

  revalidatePath("/caja");
  const r = rem as { number: number; created_at: string };
  const customer = order.customers as unknown as { name: string; whatsapp: string | null; address: string | null } | null;
  return {
    number: r.number,
    createdAt: r.created_at,
    business: {
      name: tenant.name,
      whatsapp: tenant.whatsapp,
      instagram: tenant.instagram,
      logoUrl: tenant.logo_url,
    },
    customer,
    items: [
      {
        description: order.details ? `${order.title} — ${order.details}` : order.title,
        quantity: Number(order.quantity),
        unitPrice: Number(order.price),
      },
    ],
    paymentMethod,
  };
}
