"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { sendCustomerOrderShipped, sendOwnerNotification } from "@/lib/email";
import { suggestedRefund } from "@/lib/finance";
import { getActiveLocationId } from "@/lib/location";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { Membership, OrderStatus } from "@/lib/types";

const STATUSES: OrderStatus[] = ["espera", "proceso", "calidad", "enviado"];

function revalidate() {
  revalidatePath("/pedidos");
  revalidatePath("/pedidos/[id]", "page");
  revalidatePath("/inicio");
  revalidatePath("/insumos");
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function ownerEmails(supabase: Awaited<ReturnType<typeof getSession>>["supabase"], tenantId: string): Promise<string[]> {
  const { data } = await supabase.rpc("list_members", { p_tenant_id: tenantId });
  return ((data ?? []) as Membership[]).filter((m) => m.role === "owner").map((m) => m.email);
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
    channel: String(formData.get("channel") ?? "").trim() || null,
    assigned_to: String(formData.get("assigned_to") ?? "") || null,
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

    // Se espera a que termine (no "fire and forget"): en el runtime de Cloudflare Workers,
    // una promesa sin await puede cortarse apenas la acción responde, antes de que el fetch
    // a Resend llegue a completarse.
    const to = await ownerEmails(supabase, tenant.id);
    const origin = await siteOrigin();
    await sendOwnerNotification({
      to,
      subject: `Nuevo pedido: ${record.title}`,
      heading: "Tienes un pedido nuevo 🧵",
      bodyHtml: `Se registró <strong>${record.title}</strong>${record.quantity > 1 ? ` x${record.quantity}` : ""} en tu taller.`,
      ctaHref: `${origin}/pedidos`,
      ctaLabel: "Ver pedidos",
    });
  }
  revalidate();
}

export async function moveOrder(id: string, status: OrderStatus) {
  if (!STATUSES.includes(status)) return;
  const { supabase, tenant } = await getSession();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo mover el pedido.");

  if (status === "enviado") {
    const { data: order } = await supabase
      .from("orders")
      .select("title, quantity, tracking_token, customers(name, email)")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();
    const customer = order?.customers as unknown as { name: string; email: string | null } | null;
    if (order && customer?.email) {
      const origin = await siteOrigin();
      await sendCustomerOrderShipped({
        to: customer.email,
        customerName: customer.name,
        orderTitle: order.title,
        trackingUrl: `${origin}/seguimiento/${order.tracking_token}`,
      });
    }
  }
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

/** Registra un abono real del pedido (saldo = precio − Σ abonos), sin pasarela de pago. */
export async function registerOrderPayment(orderId: string, amount: number, method: string) {
  const { supabase, role } = await getSession();
  if (!canFully(role, "manage_orders")) throw new Error("No tienes permiso para registrar pagos de este pedido.");
  const { error } = await supabase.rpc("register_order_payment", { p_order_id: orderId, p_amount: amount, p_method: method });
  if (error) throw new Error(error.message);
  revalidate();
  revalidatePath("/caja");
}

export async function assignOrder(orderId: string, userId: string | null) {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "manage_orders")) throw new Error("No tienes permiso para asignar pedidos.");
  const { error } = await supabase.from("orders").update({ assigned_to: userId }).eq("id", orderId).eq("tenant_id", tenant.id);
  if (error) throw new Error("No se pudo asignar el pedido.");
  revalidate();
}

/** La sugerencia de reparto de la vista Capacidad: mismo camino que asignar a mano. */
export async function applySuggestion(orderId: string, userId: string) {
  await assignOrder(orderId, userId);
}

/** Lo que necesita la hoja de cancelar antes de confirmar: pagado real, horas reales tejidas,
 * y la devolución justa calculada (editable por quien cancela). */
export async function getCancelPreview(
  orderId: string,
): Promise<{ totalPaid: number; loggedSeconds: number; hourlyRate: number; suggested: number; error?: string }> {
  const { supabase, tenant } = await getSession();
  const [{ data: order }, { data: balance }, { data: sessions }] = await Promise.all([
    supabase.from("orders").select("price, quantity").eq("id", orderId).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.rpc("get_order_balance", { p_order_id: orderId }),
    supabase.from("timer_sessions").select("seconds").eq("tenant_id", tenant.id).eq("order_id", orderId),
  ]);
  const hourlyRate = Number(tenant.hourly_rate);
  if (!order) return { totalPaid: 0, loggedSeconds: 0, hourlyRate, suggested: 0, error: "Pedido no encontrado." };

  const total = Number(order.price) * order.quantity;
  const totalPaid = Math.max(0, total - Number(balance ?? total));
  const loggedSeconds = (sessions ?? []).reduce((s, r) => s + Number(r.seconds), 0);
  return { totalPaid, loggedSeconds, hourlyRate, suggested: suggestedRefund(totalPaid, loggedSeconds, hourlyRate) };
}

/** Cancela el pedido (no aplica a enviados) y registra la devolución justa en Caja, si aplica. */
export async function cancelOrder(orderId: string, reason: string, refundAmount: number): Promise<{ error?: string }> {
  const { supabase, role } = await getSession();
  if (!canFully(role, "manage_orders")) return { error: "No tienes permiso para cancelar pedidos." };
  const { error } = await supabase.rpc("cancel_order", { p_order_id: orderId, p_reason: reason, p_refund_amount: refundAmount });
  if (error) return { error: error.message };
  revalidate();
  revalidatePath("/caja");
  revalidatePath("/finanzas");
  return {};
}

/** Cada quien edita su propia disponibilidad; Propietaria/Administración, cualquiera (RLS lo refuerza). */
export async function upsertAvailability(userId: string, weekday: number, hoursValue: number) {
  const { supabase, tenant, user, role } = await getSession();
  if (userId !== user.id && role !== "owner" && role !== "admin") {
    throw new Error("No tienes permiso para editar la disponibilidad de otra persona.");
  }
  const { error } = await supabase
    .from("availability")
    .upsert({ tenant_id: tenant.id, user_id: userId, weekday, hours: Math.max(0, hoursValue) }, { onConflict: "tenant_id,user_id,weekday" });
  if (error) throw new Error("No se pudo guardar la disponibilidad.");
  revalidatePath("/pedidos");
}
