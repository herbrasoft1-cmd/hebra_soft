import { redirect } from "next/navigation";
import { IconChart, IconTrendUp } from "@/components/icons";
import { RankingBars, TrendBars } from "@/components/charts";
import { EmptyState, PageHeader } from "@/components/ui/page-header";
import { costBreakdown } from "@/lib/costing";
import { money, shortMonth } from "@/lib/format";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";

export const metadata = { title: "Analítica" };

type TxRow = { type: "ingreso" | "gasto"; category: string; amount: number; occurred_on: string };
type OrderRow = { product_id: string | null; price: number; quantity: number; created_at: string; products: { name: string } | null };
type ProductRow = {
  sale_price: number | null;
  labor_seconds: number;
  product_supplies: { quantity: number; supplies: { unit_cost: number } | null }[];
};

const monthKey = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  return `${d.getFullYear()}-${d.getMonth()}`;
};

export default async function AnalyticsPage() {
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "view_finance")) redirect("/inicio");

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const periodStartIso = periodStart.toISOString().slice(0, 10);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);

  const [{ data: tx }, { data: orders }, { data: products }] = await Promise.all([
    supabase
      .from("transactions")
      .select("type, category, amount, occurred_on")
      .eq("tenant_id", tenant.id)
      .gte("occurred_on", periodStartIso),
    supabase
      .from("orders")
      .select("product_id, price, quantity, created_at, products(name)")
      .eq("tenant_id", tenant.id)
      .gte("created_at", periodStartIso),
    supabase
      .from("products")
      .select("sale_price, labor_seconds, product_supplies(quantity, supplies(unit_cost))")
      .eq("tenant_id", tenant.id),
  ]);

  const transactions = (tx ?? []) as TxRow[];
  const orderRows = (orders ?? []) as unknown as OrderRow[];
  const productRows = (products ?? []) as unknown as ProductRow[];
  const hasAnyData = transactions.length > 0 || orderRows.length > 0;

  // Ventas por mes (últimos 6 meses, incluido el actual)
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: shortMonth(d) };
  });
  const incomeByMonth = new Map<string, number>();
  const expenseByCategory = new Map<string, number>();
  for (const t of transactions) {
    if (t.type === "ingreso") {
      const key = monthKey(t.occurred_on);
      incomeByMonth.set(key, (incomeByMonth.get(key) ?? 0) + Number(t.amount));
    } else {
      expenseByCategory.set(t.category, (expenseByCategory.get(t.category) ?? 0) + Number(t.amount));
    }
  }
  const revenueTrend = months.map((m) => ({ label: m.label, value: incomeByMonth.get(m.key) ?? 0 }));

  // Productos más vendidos del período
  const revenueByProduct = new Map<string, number>();
  for (const o of orderRows) {
    if (!o.product_id) continue;
    const name = o.products?.name ?? "Sin nombre";
    revenueByProduct.set(name, (revenueByProduct.get(name) ?? 0) + Number(o.price) * Number(o.quantity));
  }
  const topProducts = Array.from(revenueByProduct.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([label, value]) => ({ label, value }));

  const topExpenses = Array.from(expenseByCategory.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([label, value]) => ({ label, value }));

  // Insights: comparación mes vs mes anterior, mayor gasto, margen real promedio
  const thisMonthIncome = transactions
    .filter((t) => t.type === "ingreso" && t.occurred_on >= monthStart)
    .reduce((s, t) => s + Number(t.amount), 0);
  const prevMonthIncome = transactions
    .filter((t) => t.type === "ingreso" && t.occurred_on >= prevMonthStart && t.occurred_on < monthStart)
    .reduce((s, t) => s + Number(t.amount), 0);
  const incomeChangePct = prevMonthIncome > 0 ? Math.round(((thisMonthIncome - prevMonthIncome) / prevMonthIncome) * 100) : null;

  const totalExpense = Array.from(expenseByCategory.values()).reduce((s, v) => s + v, 0);
  const topExpenseShare = topExpenses[0] && totalExpense > 0 ? Math.round((topExpenses[0].value / totalExpense) * 100) : null;

  const pricedProducts = productRows.filter((p) => p.sale_price && p.sale_price > 0);
  const margins = pricedProducts
    .map((p) => {
      const b = costBreakdown({
        lines: p.product_supplies.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies?.unit_cost ?? 0) })),
        laborSeconds: p.labor_seconds,
        hourlyRate: Number(tenant.hourly_rate),
        toolWearPct: Number(tenant.tool_wear_pct),
      });
      return b.total > 0 ? ((Number(p.sale_price) - b.total) / Number(p.sale_price)) * 100 : null;
    })
    .filter((m): m is number => m !== null);
  const avgMargin = margins.length > 0 ? Math.round(margins.reduce((s, m) => s + m, 0) / margins.length) : null;

  const insights: string[] = [];
  if (incomeChangePct !== null) {
    insights.push(
      incomeChangePct >= 0
        ? `Tus ventas subieron ${incomeChangePct}% este mes frente al anterior.`
        : `Tus ventas bajaron ${Math.abs(incomeChangePct)}% este mes frente al anterior.`,
    );
  }
  if (topProducts[0]) {
    insights.push(`${topProducts[0].label} es tu producto más vendido del período, con ${money(topProducts[0].value)} en ingresos.`);
  }
  if (topExpenses[0] && topExpenseShare !== null) {
    insights.push(`${topExpenses[0].label} es tu mayor gasto: ${topExpenseShare}% de lo que gastaste este período.`);
  }
  if (avgMargin !== null) {
    insights.push(
      `Tu margen real promedio en el recetario es ${avgMargin}%, calculado sobre ${pricedProducts.length} producto${pricedProducts.length === 1 ? "" : "s"} con precio.`,
    );
  }

  return (
    <>
      <PageHeader title="Analítica" subtitle="Lo que dicen tus números de los últimos 6 meses." />

      {!hasAnyData ? (
        <EmptyState
          icon={IconChart}
          title="Todavía no hay datos suficientes"
          text="Registra ventas y gastos en Caja, y crea pedidos: aquí vas a ver tendencias e insights de tu negocio."
        />
      ) : (
        <div className="flex flex-col gap-6">
          {insights.length > 0 && (
            <ul className="grid gap-3 sm:grid-cols-2">
              {insights.map((text) => (
                <li key={text} className="card flex items-start gap-3 p-4">
                  <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-ink">
                    <IconTrendUp size={14} />
                  </span>
                  <p className="text-sm text-ink-2">{text}</p>
                </li>
              ))}
            </ul>
          )}

          <TrendBars title="Ventas por mes" data={revenueTrend} format="compact" />

          <div className="grid gap-6 lg:grid-cols-2">
            <RankingBars
              title="Productos más vendidos"
              data={topProducts}
              tone="primary"
              emptyText="Aún no tienes pedidos con un patrón del recetario asociado."
            />
            <RankingBars
              title="Gastos por categoría"
              data={topExpenses}
              tone="sage"
              emptyText="Aún no has registrado gastos en Caja."
            />
          </div>
        </div>
      )}
    </>
  );
}
