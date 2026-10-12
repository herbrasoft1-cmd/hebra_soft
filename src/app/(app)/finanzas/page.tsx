import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { costBreakdown } from "@/lib/costing";
import { AGING_BUCKETS, channelCommission, incomeStatement, receivableAging } from "@/lib/finance";
import { compactMoney, money, whatsappLink } from "@/lib/format";
import { getActiveLocationId } from "@/lib/location";
import { canFully } from "@/lib/permissions";
import { computeSaldo } from "@/lib/tracking";
import { getSession } from "@/lib/tenant";
import type { Invoice, Order, SalesChannel, Transaction } from "@/lib/types";
import { DocumentsTable, type DocRow } from "./documents-table";
import { ExportCsvButton } from "./export-csv-button";
import { WaterfallChart } from "./waterfall-chart";

export const metadata = { title: "Finanzas" };

const AGING_LABEL: Record<(typeof AGING_BUCKETS)[number], string> = {
  "0-15": "0–15 días",
  "16-30": "16–30 días",
  "31-60": "31–60 días",
  "60+": "Más de 60 días",
};

function parseMonth(mes?: string) {
  if (mes && /^\d{4}-\d{2}$/.test(mes)) {
    const [y, m] = mes.split("-").map(Number);
    return { year: y!, month: m! - 1 };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() };
}

function monthParam(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  const { mes } = await searchParams;
  const { supabase, tenant, role } = await getSession();
  if (!canFully(role, "view_finance")) redirect("/inicio");

  const { year, month } = parseMonth(mes);
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 1);
  const monthStartIso = monthStart.toISOString().slice(0, 10);
  const monthEndIso = monthEnd.toISOString().slice(0, 10);
  const monthLabel = monthStart
    .toLocaleDateString("es-CO", { month: "long", year: "numeric" })
    .replace(/^\w/, (c) => c.toUpperCase());
  const prevMes = monthParam(new Date(year, month - 1, 1));
  const nextMes = monthParam(new Date(year, month + 1, 1));
  const today = new Date();

  const activeLocationId = await getActiveLocationId();
  let txQuery = supabase.from("transactions").select("*").eq("tenant_id", tenant.id).gte("occurred_on", monthStartIso).lt("occurred_on", monthEndIso);
  let ordersQuery = supabase
    .from("orders")
    .select("id, title, price, quantity, due_date, paid, created_at, product_id, channel, customers(id, name, whatsapp, document_number)")
    .eq("tenant_id", tenant.id);
  if (activeLocationId) {
    txQuery = txQuery.eq("location_id", activeLocationId);
    ordersQuery = ordersQuery.eq("location_id", activeLocationId);
  }

  const [{ data: txMonth }, { data: allIncomeTx }, { data: orders }, { data: products }, { data: channels }, { data: invoices }, { data: remissions }] =
    await Promise.all([
      txQuery.order("occurred_on", { ascending: false }),
      supabase.from("transactions").select("order_id, amount").eq("tenant_id", tenant.id).eq("type", "ingreso").not("order_id", "is", null),
      ordersQuery.order("due_date", { ascending: true, nullsFirst: false }).limit(300),
      supabase.from("products").select("id, labor_seconds, product_supplies(quantity, supplies(unit_cost))").eq("tenant_id", tenant.id),
      supabase.from("sales_channels").select("*").eq("tenant_id", tenant.id),
      supabase.from("invoices").select("*, orders(title, customers(name))").eq("tenant_id", tenant.id).order("number", { ascending: false }).limit(50),
      supabase.from("remissions").select("id, number, total, created_at, orders(title, customers(name))").eq("tenant_id", tenant.id).order("number", { ascending: false }).limit(50),
    ]);

  type OrderRow = Order & { customers: { id: string; name: string; whatsapp: string | null; document_number: string | null } | null };
  const orderRows = (orders ?? []) as unknown as OrderRow[];
  const txRows = (txMonth ?? []) as Transaction[];

  // --- Saldo real por pedido (reutiliza la misma idea de computeSaldo de la Fase 8) ---
  const incomeByOrder = new Map<string, number[]>();
  for (const t of (allIncomeTx ?? []) as { order_id: string; amount: number }[]) {
    incomeByOrder.set(t.order_id, [...(incomeByOrder.get(t.order_id) ?? []), Number(t.amount)]);
  }
  const balanceOf = (o: OrderRow) => computeSaldo(Number(o.price) * o.quantity, incomeByOrder.get(o.id) ?? []);

  // --- KPIs ---
  const income = txRows.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);

  type ProductRow = { id: string; labor_seconds: number; product_supplies: { quantity: number; supplies: { unit_cost: number } | null }[] };
  const productById = new Map((products ?? []).map((p) => [p.id, p as unknown as ProductRow]));
  const channelByName = new Map((channels ?? []).map((c) => [c.name, c as SalesChannel]));
  const soldThisMonth = orderRows.filter((o) => o.paid && o.product_id && o.created_at >= monthStartIso && o.created_at < monthEndIso);

  let materials = 0;
  let labor = 0;
  let commissions = 0;
  for (const o of soldThisMonth) {
    const p = productById.get(o.product_id!);
    if (p) {
      const breakdown = costBreakdown({
        lines: p.product_supplies.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies?.unit_cost ?? 0) })),
        laborSeconds: p.labor_seconds,
        hourlyRate: Number(tenant.hourly_rate),
        toolWearPct: Number(tenant.tool_wear_pct),
      });
      materials += breakdown.materials * o.quantity;
      labor += breakdown.labor * o.quantity;
    }
    commissions += channelCommission(Number(o.price), o.quantity, o.channel ? (channelByName.get(o.channel) ?? null) : null);
  }
  const fixedExpenses = txRows.filter((t) => t.type === "gasto" && t.category.trim().toLowerCase() === "gastos fijos").reduce((s, t) => s + Number(t.amount), 0);
  const statement = incomeStatement({ income, materials, labor, commissions, fixedExpenses });

  // --- Cartera por antigüedad ---
  const pending = orderRows.map((o) => ({ order: o, balance: balanceOf(o) })).filter((p) => p.balance > 0);
  const aging = receivableAging(
    pending.map((p) => ({ balance: p.balance, dueDate: p.order.due_date, createdAt: p.order.created_at })),
    today,
  );
  const totalReceivable = pending.reduce((s, p) => s + p.balance, 0);
  const overdue30 = aging["31-60"] + aging["60+"];

  // --- Documentos de venta (facturas + remisiones unificadas) ---
  type InvoiceRow = Invoice & { orders: { title: string; customers: { name: string } | null } | null };
  const docs: DocRow[] = [
    ...((invoices ?? []) as unknown as InvoiceRow[]).map((d) => ({
      kind: "factura" as const,
      id: d.id,
      num: `FE-${String(d.number).padStart(4, "0")}`,
      client: d.orders?.customers?.name ?? d.orders?.title ?? "Sin cliente",
      date: d.created_at,
      total: d.total,
      status: d.status,
      errorMessage: d.error_message,
    })),
    ...((remissions ?? []) as unknown as { id: string; number: number; total: number; created_at: string; orders: { title: string; customers: { name: string } | null } | null }[]).map((r) => ({
      kind: "remision" as const,
      id: r.id,
      num: `RM-${String(r.number).padStart(4, "0")}`,
      client: r.orders?.customers?.name ?? r.orders?.title ?? "Sin cliente",
      date: r.created_at,
      total: r.total,
      status: "enviada" as const,
      errorMessage: null,
    })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <PageHeader
        title="Finanzas"
        subtitle="Estado de resultados, cartera y facturación electrónica en un solo lugar."
        action={
          <div className="flex items-center gap-2">
            <Link href={`/finanzas?mes=${prevMes}`} className="btn-ghost min-h-10 px-3 text-sm" aria-label="Mes anterior">
              ←
            </Link>
            <span className="btn min-h-10 border border-border px-4 text-sm">{monthLabel}</span>
            <Link href={`/finanzas?mes=${nextMes}`} className="btn-ghost min-h-10 px-3 text-sm" aria-label="Mes siguiente">
              →
            </Link>
            <ExportCsvButton rows={txRows} monthLabel={monthLabel} />
          </div>
        }
      />

      <div className="mb-6 grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <KpiCard label="Ingresos" value={compactMoney(income)} />
        <KpiCard label="Costo de producción" value={compactMoney(statement.costOfProduction)}>
          <span className="text-xs text-muted">Materiales + mano de obra</span>
        </KpiCard>
        <KpiCard label="Utilidad neta" value={compactMoney(statement.netProfit)}>
          <span className="text-xs text-muted">{statement.netMarginPct.toFixed(1).replace(".", ",")}% de los ingresos</span>
        </KpiCard>
        <KpiCard label="Por cobrar" value={compactMoney(totalReceivable)}>
          {overdue30 > 0 && <span className="text-xs text-danger-ink">{money(overdue30)} vencido +30 días</span>}
        </KpiCard>
      </div>

      <div className="mb-6 flex flex-wrap gap-4">
        <section className="card flex min-w-0 flex-[3_1_560px] flex-col gap-4 p-5">
          <h2 className="font-display text-lg font-semibold">De ingresos a utilidad</h2>
          <WaterfallChart statement={statement} />
          <p className="text-xs text-muted">
            Los gastos fijos salen de los movimientos de Caja con categoría &quot;Gastos fijos&quot; —
            regístralos ahí para que aparezcan en esta cascada.
          </p>
        </section>

        <section className="card flex min-w-0 flex-[2_1_340px] flex-col gap-3.5 p-5">
          <h2 className="font-display text-lg font-semibold">Cartera por antigüedad</h2>
          <div className="flex h-3.5 overflow-hidden rounded-full">
            {AGING_BUCKETS.map((b, i) => (
              <div
                key={b}
                className={["bg-success", "bg-warning", "bg-primary", "bg-danger"][i]}
                style={{ flex: totalReceivable > 0 ? aging[b] : 1, opacity: totalReceivable > 0 ? 1 : 0.15 }}
              />
            ))}
          </div>
          <div className="flex flex-col gap-2 text-[13px] tabular-nums">
            {AGING_BUCKETS.map((b, i) => (
              <div key={b} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className={`size-2.5 rounded-[3px] ${["bg-success", "bg-warning", "bg-primary", "bg-danger"][i]}`} />
                  {AGING_LABEL[b]}
                </span>
                <span>{money(aging[b])}</span>
              </div>
            ))}
          </div>
          {pending.length === 0 ? (
            <p className="text-sm text-muted">No hay saldos pendientes.</p>
          ) : (
            <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
              {pending
                .filter((p) => p.order.customers?.whatsapp)
                .slice(0, 6)
                .map(({ order, balance }) => {
                  const wa = whatsappLink(
                    order.customers!.whatsapp,
                    `Hola ${order.customers!.name}, te escribo por el saldo pendiente de ${money(balance)} de tu pedido "${order.title}".`,
                  );
                  return (
                    <div key={order.id} className="flex items-center justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{order.customers!.name}</span>
                      <a href={wa!} target="_blank" rel="noreferrer" className="btn-ghost min-h-9 shrink-0 px-2.5 text-xs">
                        Recordar
                      </a>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
      </div>

      <section className="card flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Documentos de venta</h2>
        </div>
        <DocumentsTable docs={docs} />
      </section>
    </>
  );
}
