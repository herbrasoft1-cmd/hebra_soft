import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { getSession } from "@/lib/tenant";
import type { Product, ProductSupply, Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { RecipeEditor } from "./recipe-editor";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, tenant } = await getSession();

  const [{ data: product }, { data: lines }, { data: supplies }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase
      .from("product_supplies")
      .select("id, product_id, supply_id, quantity, supplies(id, name, unit, unit_cost, quantity_remaining, lot_color)")
      .eq("product_id", id)
      .eq("tenant_id", tenant.id),
    supabase
      .from("supplies")
      .select("id, name, unit, unit_cost, lot_color, quantity_remaining")
      .eq("tenant_id", tenant.id)
      .order("name"),
  ]);

  if (!product) notFound();
  const mod = getIndustryModule(tenant.industry);

  return (
    <>
      <Link href="/recetario" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted">
        <IconBack size={18} /> {mod.recipe.menuLabel}
      </Link>
      <RecipeEditor
        product={product as Product}
        lines={(lines ?? []) as unknown as ProductSupply[]}
        supplies={(supplies ?? []) as Supply[]}
        hourlyRate={Number(tenant.hourly_rate)}
        toolWearPct={Number(tenant.tool_wear_pct)}
        itemLabel={mod.recipe.itemLabel}
        timerLabel={mod.timer.label}
        activeVerb={mod.timer.activeVerb}
      />
    </>
  );
}
