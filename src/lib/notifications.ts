import { canFully } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import type { createClient } from "@/lib/supabase/server";

export type Notification = {
  id: string;
  title: string;
  text: string;
  severity: "warning" | "danger";
  href: string;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

/**
 * Notificaciones reales, calculadas con datos que ya existen (nada inventado). Cada tipo solo se
 * consulta si el rol tiene el permiso correspondiente, y solo aparece si hay algo que contar.
 *
 * Pendiente de activar/conectar (requieren cálculos más pesados que no caben en cada carga de
 * página — ver docs/bitacora.md): insumo agotado cruzado con la receta de un pedido específico
 * (ya existe `blockedOrders`/`ordersAtRisk`, pero necesita las consultas completas de productos +
 * disponibilidad que hoy solo se piden en Analítica/Insumos); tejedora con más horas comprometidas
 * que disponibles esta semana.
 */
export async function getNotifications(
  supabase: Supabase,
  tenantId: string,
  role: Role,
  activeLocationId: string | null,
): Promise<Notification[]> {
  const notifications: Notification[] = [];
  const canCosts = canFully(role, "view_costs");
  const canFinance = canFully(role, "view_finance");
  const canOrders = canFully(role, "manage_orders");
  const todayIso = new Date().toISOString().slice(0, 10);

  const tasks: Promise<void>[] = [];

  // Insumos bajo punto de reorden: una sola consulta trae lo necesario para comparar en código
  // (igual criterio que /insumos y el panel ejecutivo), sin repetir la lógica en SQL.
  if (canCosts) {
    tasks.push(
      (async () => {
        let q = supabase
          .from("supplies")
          .select("quantity_remaining, low_stock_threshold")
          .eq("tenant_id", tenantId)
          .gt("low_stock_threshold", 0);
        if (activeLocationId) q = q.eq("location_id", activeLocationId);
        const { data } = await q;
        const low = (data ?? []).filter((s) => Number(s.quantity_remaining) <= Number(s.low_stock_threshold));
        if (low.length > 0) {
          notifications.push({
            id: "insumos-bajo-reorden",
            title: "Insumos",
            text: `${low.length} insumo${low.length === 1 ? "" : "s"} por debajo del punto de reorden.`,
            severity: "warning",
            href: "/insumos",
          });
        }
      })(),
    );

    tasks.push(
      (async () => {
        let q = supabase.from("purchase_orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "por_aprobar");
        if (activeLocationId) q = q.eq("location_id", activeLocationId);
        const { count } = await q;
        if ((count ?? 0) > 0) {
          notifications.push({
            id: "ordenes-por-aprobar",
            title: "Insumos",
            text: `${count} orden${count === 1 ? "" : "es"} de compra por aprobar.`,
            severity: "warning",
            href: "/insumos",
          });
        }
      })(),
    );
  }

  if (canOrders) {
    tasks.push(
      (async () => {
        let q = supabase
          .from("orders")
          .select("id", { count: "exact", head: true })
          .eq("tenant_id", tenantId)
          .is("cancelled_at", null)
          .neq("status", "enviado")
          .lt("due_date", todayIso);
        if (activeLocationId) q = q.eq("location_id", activeLocationId);
        const { count } = await q;
        if ((count ?? 0) > 0) {
          notifications.push({
            id: "pedidos-vencidos",
            title: "Pedidos",
            text: `${count} pedido${count === 1 ? "" : "s"} vencido${count === 1 ? "" : "s"}, sin enviar todavía.`,
            severity: "danger",
            href: "/pedidos",
          });
        }
      })(),
    );
  }

  if (canFinance) {
    tasks.push(
      (async () => {
        const { count } = await supabase.from("invoices").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "rechazada");
        if ((count ?? 0) > 0) {
          notifications.push({
            id: "facturas-rechazadas",
            title: "Finanzas",
            text: `${count} factura${count === 1 ? "" : "s"} rechazada${count === 1 ? "" : "s"}, pendiente${count === 1 ? "" : "s"} de reintentar.`,
            severity: "danger",
            href: "/finanzas",
          });
        }
      })(),
    );
  }

  if (role === "owner") {
    tasks.push(
      (async () => {
        const { count } = await supabase.from("invitations").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).is("accepted_at", null);
        if ((count ?? 0) > 0) {
          notifications.push({
            id: "invitaciones-pendientes",
            title: "Equipo",
            text: `${count} invitación${count === 1 ? "" : "es"} pendiente${count === 1 ? "" : "s"} de aceptar.`,
            severity: "warning",
            href: "/configuracion",
          });
        }
      })(),
    );
  }

  await Promise.all(tasks);
  return notifications;
}
