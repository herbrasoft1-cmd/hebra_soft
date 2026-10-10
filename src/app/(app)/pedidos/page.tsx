import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/tenant";
import type { Customer, Order } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { Board } from "./board";

export const metadata = { title: "Pedidos" };

export default async function OrdersPage() {
  const { supabase, tenant } = await getSession();
  const mod = getIndustryModule(tenant.industry);

  const [{ data: orders }, { data: customers }, { data: products }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customers(name, whatsapp, instagram, address)")
      .eq("tenant_id", tenant.id)
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("customers").select("*").eq("tenant_id", tenant.id).order("name"),
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
      />
    </>
  );
}
