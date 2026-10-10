"use server";

import { revalidatePath } from "next/cache";
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
    const { data } = await supabase
      .from("customers")
      .insert({
        tenant_id: tenant.id,
        name: newCustomer,
        whatsapp: String(formData.get("new_customer_whatsapp") ?? "").trim() || null,
        instagram: String(formData.get("new_customer_instagram") ?? "").trim() || null,
      })
      .select("id")
      .single();
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
    await supabase.from("orders").update(record).eq("id", id).eq("tenant_id", tenant.id);
  } else {
    await supabase.from("orders").insert({ ...record, tenant_id: tenant.id, status: "espera" });
  }
  revalidate();
}

export async function moveOrder(id: string, status: OrderStatus) {
  if (!STATUSES.includes(status)) return;
  const { supabase, tenant } = await getSession();
  await supabase.from("orders").update({ status }).eq("id", id).eq("tenant_id", tenant.id);
  revalidate();
}

export async function deleteOrder(formData: FormData) {
  const { supabase, tenant } = await getSession();
  await supabase.from("orders").delete().eq("id", String(formData.get("id"))).eq("tenant_id", tenant.id);
  revalidate();
}

/** Marca el pedido como pagado y lo registra como ingreso en la caja. */
export async function markPaid(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const id = String(formData.get("id"));
  const method = String(formData.get("payment_method") ?? "Transferencia");
  const { data: order } = await supabase
    .from("orders")
    .select("id, title, price, quantity, paid")
    .eq("id", id)
    .eq("tenant_id", tenant.id)
    .single();
  if (!order || order.paid) return;

  await supabase.from("orders").update({ paid: true }).eq("id", id).eq("tenant_id", tenant.id);
  await supabase.from("transactions").insert({
    tenant_id: tenant.id,
    type: "ingreso",
    category: "Venta",
    description: order.title,
    amount: Number(order.price) * Number(order.quantity),
    payment_method: method,
    order_id: order.id,
  });
  revalidate();
  revalidatePath("/caja");
}
