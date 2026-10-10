import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/tenant";
import type { Customer } from "@/lib/types";
import { CustomersView } from "./customers-view";

export const metadata = { title: "Clientes" };

export default async function CustomersPage() {
  const { supabase, tenant } = await getSession();
  const [{ data: customers }, { data: orders }] = await Promise.all([
    supabase.from("customers").select("*").eq("tenant_id", tenant.id).order("name"),
    supabase.from("orders").select("customer_id, price, quantity").eq("tenant_id", tenant.id),
  ]);

  const stats = new Map<string, { count: number; total: number }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const s = stats.get(o.customer_id) ?? { count: 0, total: 0 };
    s.count += 1;
    s.total += Number(o.price) * Number(o.quantity);
    stats.set(o.customer_id, s);
  }

  return (
    <>
      <PageHeader title="Clientes" subtitle="Ficha de cada persona que te compra." />
      <CustomersView
        customers={((customers ?? []) as Customer[]).map((c) => ({ ...c, stats: stats.get(c.id) ?? { count: 0, total: 0 } }))}
      />
    </>
  );
}
