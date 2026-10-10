import { PageHeader } from "@/components/page-header";
import { getSession } from "@/lib/tenant";
import type { Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { SuppliesView } from "./supplies-view";

export const metadata = { title: "Insumos" };

export default async function SuppliesPage() {
  const { supabase, tenant } = await getSession();
  const { data } = await supabase
    .from("supplies")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("name");

  const mod = getIndustryModule(tenant.industry);

  return (
    <>
      <PageHeader title="Insumos" subtitle="Lo que compras en volumen y usas por partes." />
      <SuppliesView supplies={(data ?? []) as Supply[]} units={mod.defaultUnits} examples={mod.supplyExamples} />
    </>
  );
}
