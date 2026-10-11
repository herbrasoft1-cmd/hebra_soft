import { Pager } from "@/components/pager";
import { PageHeader } from "@/components/ui/page-header";
import { getSession } from "@/lib/tenant";
import type { Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { SuppliesView } from "./supplies-view";

export const metadata = { title: "Insumos" };

const PAGE_SIZE = 50;

export default async function SuppliesPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { page: pageParam } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { supabase, tenant } = await getSession();
  const { data, count } = await supabase
    .from("supplies")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenant.id)
    .order("name")
    .range(from, to);

  const mod = getIndustryModule(tenant.industry);
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / PAGE_SIZE));

  return (
    <>
      <PageHeader title="Insumos" subtitle="Lo que compras en volumen y usas por partes." />
      <SuppliesView supplies={(data ?? []) as Supply[]} units={mod.defaultUnits} examples={mod.supplyExamples} />
      <Pager page={page} totalPages={totalPages} basePath="/insumos" />
    </>
  );
}
