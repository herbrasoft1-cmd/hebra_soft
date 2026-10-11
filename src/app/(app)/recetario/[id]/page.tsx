import Link from "next/link";
import { notFound } from "next/navigation";
import { IconBack } from "@/components/icons";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import type { Membership, Product, ProductStep, ProductSupply, ProductVersion, SalesChannel, Supply } from "@/lib/types";
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

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

  const [{ data: product }, { data: lines }, { data: supplies }, { data: channels }, { data: versions }, { data: members }, { count: soldCount }, { data: timerSessions }, { data: steps }] =
    await Promise.all([
      supabase.from("products").select("*").eq("id", id).eq("tenant_id", tenant.id).maybeSingle(),
      supabase.from("product_supplies").select(linesSelect).eq("product_id", id).eq("tenant_id", tenant.id),
      canEdit
        ? supabase.from("supplies").select("id, name, unit, unit_cost, lot_color, quantity_remaining").eq("tenant_id", tenant.id).order("name")
        : Promise.resolve({ data: [] }),
      canEdit ? supabase.from("sales_channels").select("*").eq("tenant_id", tenant.id).order("created_at") : Promise.resolve({ data: [] }),
      canEdit
        ? supabase.from("product_versions").select("*").eq("product_id", id).order("version_number", { ascending: false })
        : Promise.resolve({ data: [] }),
      canEdit ? supabase.rpc("list_members", { p_tenant_id: tenant.id }) : Promise.resolve({ data: [] }),
      canEdit
        ? supabase.from("orders").select("id", { count: "exact", head: true }).eq("tenant_id", tenant.id).eq("product_id", id).eq("paid", true).gte("created_at", ninetyDaysAgo)
        : Promise.resolve({ count: 0 }),
      canEdit
        ? supabase.from("timer_sessions").select("user_id, order_id, seconds").eq("tenant_id", tenant.id).eq("product_id", id).not("order_id", "is", null)
        : Promise.resolve({ data: [] }),
      canEdit ? supabase.from("product_steps").select("*").eq("product_id", id).order("position") : Promise.resolve({ data: [] }),
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
          channels={(channels ?? []) as SalesChannel[]}
          versions={(versions ?? []) as ProductVersion[]}
          members={(members ?? []) as Membership[]}
          soldLast90Days={soldCount ?? 0}
          timerSessions={(timerSessions ?? []) as { user_id: string; order_id: string | null; seconds: number }[]}
          steps={(steps ?? []) as ProductStep[]}
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
