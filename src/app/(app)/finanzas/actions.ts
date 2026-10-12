"use server";

import { revalidatePath } from "next/cache";
import { getInvoicingProvider, type InvoiceResult } from "@/lib/invoicing";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { Invoice, InvoiceStatus } from "@/lib/types";

type OrderForInvoice = {
  id: string;
  title: string;
  details: string | null;
  quantity: number;
  price: number;
  customers: { name: string; document_number: string | null } | null;
};

async function attemptIssue(
  tenantId: string,
  order: OrderForInvoice,
): Promise<{ status: InvoiceStatus; provider: string; external_id: string | null; pdf_url: string | null; error_message: string | null; sent_at: string | null }> {
  const provider = getInvoicingProvider();
  try {
    const result: InvoiceResult = await provider.issue({
      tenantId,
      orderId: order.id,
      customer: { name: order.customers?.name ?? "Cliente", documentNumber: order.customers?.document_number ?? undefined },
      items: [{ description: order.details ? `${order.title} — ${order.details}` : order.title, quantity: order.quantity, unitPrice: order.price }],
      paymentMethod: "Transferencia",
    });
    return {
      status: "aceptada_dian",
      provider: result.provider,
      external_id: result.externalId,
      pdf_url: result.pdfUrl ?? null,
      error_message: null,
      sent_at: new Date().toISOString(),
    };
  } catch (e) {
    return {
      status: "rechazada",
      provider: provider.id,
      external_id: null,
      pdf_url: null,
      error_message: e instanceof Error ? e.message : "No se pudo emitir la factura.",
      sent_at: null,
    };
  }
}

/** Emite una factura electrónica nueva para un pedido. Registra el resultado real
 * (hoy, sin proveedor conectado, siempre queda "rechazada" con un mensaje claro —
 * nunca se inventa un estado de éxito). */
export async function createInvoice(orderId: string): Promise<{ invoice?: Invoice; error?: string }> {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "issue_invoices")) return { error: "No tienes permiso para emitir facturas." };

  const { data: order } = await supabase
    .from("orders")
    .select("id, title, details, quantity, price, customers(name, document_number)")
    .eq("id", orderId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!order) return { error: "Pedido no encontrado." };
  const o = order as unknown as OrderForInvoice;
  if (!o.customers?.document_number) {
    return { error: "Este cliente no tiene NIT/cédula. Complétalo en Clientes antes de facturar." };
  }

  const { data: number, error: numError } = await supabase.rpc("reserve_invoice_number", { p_tenant_id: tenant.id });
  if (numError || !number) return { error: numError?.message ?? "No se pudo reservar el número de factura." };

  const attempt = await attemptIssue(tenant.id, o);
  const { data: invoice, error } = await supabase
    .from("invoices")
    .insert({
      tenant_id: tenant.id,
      order_id: orderId,
      number,
      total: o.price * o.quantity,
      ...attempt,
    })
    .select("*")
    .single();
  if (error || !invoice) return { error: "No se pudo guardar la factura." };

  revalidatePath("/finanzas");
  revalidatePath("/pedidos");
  return { invoice: invoice as Invoice };
}

/** Reintenta una factura que quedó rechazada, reutilizando el mismo número. */
export async function retryInvoice(invoiceId: string): Promise<{ invoice?: Invoice; error?: string }> {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "issue_invoices")) return { error: "No tienes permiso para emitir facturas." };

  const { data: existing } = await supabase
    .from("invoices")
    .select("id, order_id, orders(id, title, details, quantity, price, customers(name, document_number))")
    .eq("id", invoiceId)
    .eq("tenant_id", tenant.id)
    .maybeSingle();
  if (!existing) return { error: "Factura no encontrada." };
  const o = existing.orders as unknown as OrderForInvoice | null;
  if (!o) return { error: "El pedido de esta factura ya no existe." };
  if (!o.customers?.document_number) {
    return { error: "Este cliente no tiene NIT/cédula. Complétalo en Clientes antes de reintentar." };
  }

  const attempt = await attemptIssue(tenant.id, o);
  const { data: invoice, error } = await supabase
    .from("invoices")
    .update(attempt)
    .eq("id", invoiceId)
    .eq("tenant_id", tenant.id)
    .select("*")
    .single();
  if (error || !invoice) return { error: "No se pudo actualizar la factura." };

  revalidatePath("/finanzas");
  return { invoice: invoice as Invoice };
}
