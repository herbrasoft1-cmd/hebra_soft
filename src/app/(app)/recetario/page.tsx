import Link from "next/link";
import { IconRecetario } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { SubmitButton } from "@/components/submit-button";
import { costBreakdown } from "@/lib/costing";
import { duration, money } from "@/lib/format";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import { getIndustryModule } from "@/modules";
import { createProduct } from "./actions";
import { StartTimerButton } from "./start-timer-button";

export const metadata = { title: "Recetario" };

type Row = {
  id: string;
  name: string;
  category: string | null;
  labor_seconds: number;
  sale_price: number | null;
  product_supplies: { quantity: number; supplies: { unit_cost: number } | null }[];
};

export default async function RecipesPage() {
  const { supabase, tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);
  const canViewCosts = canFully(role, "view_costs");
  const canEdit = canFully(role, "edit_recipes");

  // Quien no puede ver costos y márgenes tampoco necesita el unit_cost de los insumos del
  // patrón: ni se pide a la base ni se calcula, para que nunca viaje al navegador.
  const select = canViewCosts
    ? "id, name, category, labor_seconds, sale_price, product_supplies(quantity, supplies(unit_cost))"
    : "id, name, category, labor_seconds, sale_price, product_supplies(quantity)";
  const { data } = await supabase
    .from("products")
    .select(select)
    .eq("tenant_id", tenant.id)
    .order("updated_at", { ascending: false });

  const products = ((data ?? []) as unknown as Row[]).map((p) => {
    if (!canViewCosts) return { ...p, cost: null as number | null };
    const b = costBreakdown({
      lines: p.product_supplies.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies?.unit_cost ?? 0) })),
      laborSeconds: p.labor_seconds,
      hourlyRate: Number(tenant.hourly_rate),
      toolWearPct: Number(tenant.tool_wear_pct),
    });
    return { ...p, cost: b.total as number | null };
  });

  return (
    <>
      <PageHeader
        title={mod.recipe.menuLabel}
        subtitle={
          canViewCosts
            ? `Tus ${mod.recipe.itemPlural.toLowerCase()} con su costo real: materiales, tiempo y desgaste.`
            : `Consulta tus ${mod.recipe.itemPlural.toLowerCase()}: insumos, tiempo y precio.`
        }
      />

      {canEdit && (
        <form action={createProduct} className="card mb-6 flex flex-wrap items-end gap-3 p-4">
          <label className="field min-w-48 flex-[2]">
            Nuevo {mod.recipe.itemLabel.toLowerCase()}
            <input className="input" name="name" placeholder={mod.recipe.exampleName} required />
          </label>
          <label className="field min-w-36 flex-1">
            Categoría
            <input className="input" name="category" placeholder="Amigurumi" />
          </label>
          <SubmitButton pendingText="Creando…">Crear</SubmitButton>
        </form>
      )}

      {products.length === 0 ? (
        <EmptyState
          icon={IconRecetario}
          title={`Crea tu primer ${mod.recipe.itemLabel.toLowerCase()}`}
          text="Agrega los insumos que usa y mide el tiempo con el cronómetro: HEBRA te dirá cuánto cobrar."
        />
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="card flex flex-col gap-3 p-4">
              <Link href={`/recetario/${p.id}`} className="flex flex-col gap-1">
                {p.category && <span className="chip self-start bg-success-soft text-success-ink">{p.category}</span>}
                <span className="font-display text-xl">{p.name}</span>
                <span className="text-sm text-muted">
                  {p.product_supplies.length} insumos · {duration(p.labor_seconds)} de trabajo
                </span>
              </Link>
              <div className="flex items-end justify-between border-t border-border pt-3">
                <div className="flex flex-col text-sm">
                  {p.cost != null && <span className="text-muted">Costo {money(p.cost)}</span>}
                  <span className="text-[17px] font-semibold">
                    {p.sale_price ? `Precio ${money(p.sale_price)}` : "Sin precio aún"}
                  </span>
                </div>
                <StartTimerButton productId={p.id} productName={p.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
