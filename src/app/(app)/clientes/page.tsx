import { Pager } from "@/components/pager";
import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/tenant";
import type { Customer } from "@/lib/types";
import { CustomersView } from "./customers-view";

export const metadata = { title: "Clientes" };

const PAGE_SIZE = 50;

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { supabase, tenant } = await getSession();
  const { data: customers, count } = await supabase
    .from("customers")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenant.id)
    .order("name")
    .range(from, to);

  const ids = (customers ?? []).map((c) => c.id);
  const { data: orders } = ids.length
    ? await supabase.from("orders").select("customer_id, price, quantity").eq("tenant_id", tenant.id).in("customer_id", ids)
    : { data: [] };

  const stats = new Map<string, { count: number; total: number }>();
  for (const o of orders ?? []) {
    if (!o.customer_id) continue;
    const s = stats.get(o.customer_id) ?? { count: 0, total: 0 };
    s.count += 1;
    s.total += Number(o.price) * Number(o.quantity);
    stats.set(o.customer_id, s);
  }

  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Clientes" subtitle="Ficha de cada persona que te compra." />
      <CustomersView
        customers={((customers ?? []) as Customer[]).map((c) => ({ ...c, stats: stats.get(c.id) ?? { count: 0, total: 0 } }))}
      />
      <Pager page={page} totalPages={totalPages} basePath="/clientes" />
    </>
  );
}
