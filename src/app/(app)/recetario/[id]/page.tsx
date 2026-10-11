import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { Product, ProductSupply, Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { RecipeEditor } from "./recipe-editor";
import { RecipeViewer, type ReadonlyLine } from "./recipe-viewer";

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, tenant, role } = await getSession();
  const canEdit = canFully(role, "edit_recipes");

  // Quien no puede editar el recetario (ni ver costos) tampoco necesita el unit_cost de los
  // insumos: no se pide a la base para que nunca llegue al navegador.
  const linesSelect = canEdit
    ? "id, product_id, supply_id, quantity, supplies(id, name, unit, unit_cost, quantity_remaining, lot_color)"
    : "id, product_id, supply_id, quantity, supplies(id, name, unit, lot_color)";

  const [{ data: product }, { data: lines }, { data: supplies }] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
    supabase.from("product_supplies").select(linesSelect).eq("product_id", id).eq("tenant_id", tenant.id),
    canEdit
      ? supabase
          .from("supplies")
          .select("id, name, unit, unit_cost, lot_color, quantity_remaining")
          .eq("tenant_id", tenant.id)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);

  if (!product) notFound();
  const mod = getIndustryModule(tenant.industry);

  return (
    <>
      <Link href="/recetario" className="mb-4 inline-flex min-h-11 items-center gap-2 text-sm text-muted">
        <IconBack size={18} /> {mod.recipe.menuLabel}
      </Link>
      {canEdit ? (
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
      ) : (
        <RecipeViewer
          product={product as Product}
          lines={(lines ?? []) as unknown as ReadonlyLine[]}
          itemLabel={mod.recipe.itemLabel}
          timerLabel={mod.timer.label}
          activeVerb={mod.timer.activeVerb}
        />
      )}
    </>
  );
}
