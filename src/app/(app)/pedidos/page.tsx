import { PageHeader } from "@/components/ui/page-header";
import { getActiveLocationId } from "@/lib/location";
import { getSession } from "@/lib/tenant";
import type { Customer, Order } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { Board } from "./board";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const { supabase, tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);
  const activeLocationId = await getActiveLocationId();

  // El tablero es para trabajo activo, no historial: pedidos sin enviar + enviados en los
  // últimos 90 días, con un límite de seguridad para negocios con muchísimos pedidos.
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString();

  let ordersQuery = supabase
    .from("orders")
    .select("*, customers(name, whatsapp, instagram, address)")
    .eq("tenant_id", tenant.id)
    .or(`status.neq.enviado,updated_at.gte.${cutoff}`);
  if (activeLocationId) ordersQuery = ordersQuery.eq("location_id", activeLocationId);

  const [{ data: orders }, { data: customers }, { data: products }] = await Promise.all([
    ordersQuery.order("due_date", { ascending: true, nullsFirst: false }).limit(300),
    supabase.from("customers").select("*").eq("tenant_id", tenant.id).order("name").limit(300),
    supabase.from("products").select("id, name, sale_price").eq("tenant_id", tenant.id).order("name"),
  ]);

  const list = (orders ?? []) as Order[];
  const active = list.filter((o) => o.status !== "enviado").length;

  return (
    <>
      <PageHeader title="Pedidos" subtitle={`${active} pedido${active === 1 ? "" : "s"} activo${active === 1 ? "" : "s"}`} />
      <Board
        orders={list}
        customers={(customers ?? []) as Customer[]}
        products={(products ?? []) as { id: string; name: string; sale_price: number | null }[]}
        statusLabels={mod.statusLabels}
        tenant={tenant}
        role={role}
      />
    </>
  );
}
