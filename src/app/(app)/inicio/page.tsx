import Link from "next/link";
import type { ComponentType } from "react";
import { RevenueProfitChart, Sparkline } from "@/components/charts";
import { IconAgujas, IconHebra, IconOvillo, IconTrendUp, IconWallet } from "@/components/icons";
import { AlertRow } from "@/components/ui/alert-row";
import { Avatar } from "@/components/ui/avatar";
import { type Column, DataTable } from "@/components/ui/data-table";
import { KpiCard } from "@/components/ui/kpi-card";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  channelBreakdown,
  ordersAtRisk,
  periodChangePct,
  productProfitability,
  type DailyPoint,
  type ProductProfitability,
} from "@/lib/analytics";
import { costBreakdown } from "@/lib/costing";
import { compactMoney, dueLabel, money, todayLong } from "@/lib/format";
import { getActiveLocationId } from "@/lib/location";
import { canFully } from "@/lib/permissions";
import { committedHours, estimatedHours, weeklyAvailableHours } from "@/lib/production";
import { getSession } from "@/lib/tenant";
import type { Order, OrderStatus, Supply, Tenant } from "@/lib/types";
import { getIndustryModule, type IndustryModule } from "@/modules";
import { HomeActions } from "./home-actions";
import { ShiftHome } from "./shift-home";

export const metadata = { title: "Inicio" };

type Session = Awaited<ReturnType<typeof getSession>>;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ accion?: string }> }) {
  const { accion } = await searchParams;
  const session = await getSession();
  const { tenant, role } = session;
  const mod = getIndustryModule(tenant.industry);

  if (canFully(role, "view_finance")) {
    return ExecutivePanel({ session, tenant, mod });
  }
  if (role === "tejedora") {
    return ShiftHome({ session, tenant, mod });
  }
  return SimpleHome({ session, tenant, mod, accion });
}

// =============================================================================
// Vista simple (Ventas): tal cual la del MVP, sin datos financieros.
// La tejedora tiene su propia vista "Mi turno" (ShiftHome, Fase 8).
// =============================================================================

const SPARK_DAYS = 14;

async function SimpleHome({
  session,
  tenant,
  mod,
  accion,
}: {
  session: Session;
  tenant: Tenant;
  mod: IndustryModule;
  accion?: string;
}) {
  const { supabase, user } = session;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const sparkStart = new Date(now.getTime() - (SPARK_DAYS - 1) * 86400000).toISOString().slice(0, 10);
  const fetchFrom = sparkStart < monthStart ? sparkStart : monthStart;

  const [{ data: income }, { data: orders }, { data: supplies }, { data: lastProduct }] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount, occurred_on")
      .eq("tenant_id", tenant.id)
      .eq("type", "ingreso")
      .gte("occurred_on", fetchFrom),
    supabase
      .from("orders")
      .select("id, title, quantity, price, status, due_date, paid, customers(name)")
      .eq("tenant_id", tenant.id)
      .neq("status", "enviado")
      .order("due_date", { ascending: true, nullsFirst: false }),
    supabase.from("supplies").select("id, name, unit, quantity_remaining, quantity_purchased, low_stock_threshold").eq("tenant_id", tenant.id),
    supabase.from("products").select("id, name").eq("tenant_id", tenant.id).order("updated_at", { ascending: false }).limit(1).maybeSingle(),
  ]);

  const incomeRows = income ?? [];
  const monthIncome = incomeRows.filter((t) => t.occurred_on >= monthStart).reduce((s, t) => s + Number(t.amount), 0);
  const incomeByDay = new Map<string, number>();
  for (const t of incomeRows) incomeByDay.set(t.occurred_on, (incomeByDay.get(t.occurred_on) ?? 0) + Number(t.amount));
  const incomeSparkline = Array.from({ length: SPARK_DAYS }, (_, i) => {
    const d = new Date(now.getTime() - (SPARK_DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
    return incomeByDay.get(d) ?? 0;
  });
  const active = (orders ?? []) as unknown as Order[];
  const toCollect = active.filter((o) => !o.paid).reduce((s, o) => s + Number(o.price) * o.quantity, 0);
  const weekAhead = new Date(now.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const dueThisWeek = active.filter((o) => o.due_date && o.due_date <= weekAhead).length;
  const low = ((supplies ?? []) as Supply[])
    .filter((s) =>
      s.low_stock_threshold > 0
        ? Number(s.quantity_remaining) <= Number(s.low_stock_threshold)
        : Number(s.quantity_remaining) / Number(s.quantity_purchased) < 0.4,
    )
    .slice(0, 3);

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: "America/Bogota" }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Hola" : "Buenas noches";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm text-muted">{todayLong()}</span>
          <h1 className="font-display text-[30px] leading-tight md:text-[36px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[15px] text-ink-2">
            {dueThisWeek > 0
              ? `Tienes ${dueThisWeek} pedido${dueThisWeek === 1 ? "" : "s"} por entregar esta semana.`
              : "No tienes entregas urgentes esta semana."}
          </p>
        </div>
        <Link
          href="/configuracion"
          aria-label="Configuración"
          className="icon-btn size-11 shrink-0 border border-border bg-surface md:hidden"
        >
          <IconAgujas size={22} />
        </Link>
      </div>

      <HomeActions lastProduct={lastProduct} openSale={accion === "venta"} timerVerb={mod.timer.label} />

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Ventas del mes" value={money(monthIncome)} icon={IconTrendUp} tone="sage" spark={incomeSparkline} />
        <Stat label="Pedidos activos" value={String(active.length)} icon={IconHebra} tone="primary" />
        <Stat label="Por cobrar" value={money(toCollect)} icon={IconWallet} tone="ink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section className="flex flex-col gap-3.5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-xl font-semibold">Próximas entregas</h2>
            <Link href="/pedidos" className="text-sm font-semibold text-primary-hover hover:underline">
              Ver tablero
            </Link>
          </div>
          {active.length === 0 ? (
            <p className="card p-7 text-center text-sm text-muted">Sin pedidos activos. ¡Buen momento para tejer stock!</p>
          ) : (
            <ul className="card flex flex-col overflow-hidden">
              {active.slice(0, 5).map((o) => (
                <li
                  key={o.id}
                  className="flex items-center gap-3 border-b border-border px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-muted"
                >
                  <Avatar id={o.id} name={o.customers?.name ?? "?"} size={40} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{o.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {o.customers?.name ?? "Sin cliente"} · {mod.statusLabels[o.status]}
                    </span>
                  </span>
                  <span className="chip bg-primary-soft text-primary-hover">{dueLabel(o.due_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {low.length > 0 && (
          <section className="flex flex-col gap-3.5">
            <h2 className="font-display text-xl font-semibold">Por agotarse</h2>
            <div className="flex flex-col gap-2.5">
              {low.map((s) => {
                const pct = Math.round((Number(s.quantity_remaining) / Number(s.quantity_purchased)) * 100);
                return (
                  <Link
                    key={s.id}
                    href="/insumos"
                    className="card flex items-center gap-3.5 border-primary/15 bg-primary-soft/60 p-4 transition-all hover:-translate-y-0.5"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary">
                      <IconOvillo size={22} />
                    </span>
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <ProgressBar value={pct} tone="warning" />
                      <span className="text-xs text-ink-2">
                        Quedan {Number(s.quantity_remaining)} {s.unit}
                      </span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const STAT_TONE = {
  sage: "bg-success-soft text-success-ink",
  primary: "bg-primary-soft text-primary-hover",
  ink: "bg-surface-muted text-ink-2",
} as const;

function Stat({
  label,
  value,
  icon: Icon,
  tone,
  spark,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number }>;
  tone: keyof typeof STAT_TONE;
  spark?: number[];
}) {
  return (
    <div className="card flex flex-col gap-2 p-2.5 md:gap-3 md:p-5">
      <div className="flex items-center justify-between">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full md:size-9 ${STAT_TONE[tone]}`}>
          <Icon size={15} />
        </span>
        {spark && <Sparkline data={spark} className="h-6 w-14 text-success md:w-16" />}
      </div>
      <span className="flex flex-col gap-0.5">
        <span className="truncate font-display text-base leading-tight font-semibold md:text-[26px]">{value}</span>
        <span className="truncate text-[10.5px] leading-tight text-muted md:text-[13px]">{label}</span>
      </span>
    </div>
  );
}

// =============================================================================
// Panel ejecutivo (Propietaria, Administración): KPIs reales, tendencias,
// necesitan atención, rentabilidad por producto, ventas por canal, inventario
// crítico — ver docs/mockups/Ent-Dashboard.dc.html. "Necesitan atención" ya usa
// las 4 reglas del mockup (tejedora asignada y disponibilidad llegaron en la
// Fase 3). La tarjeta "Capacidad del taller" se queda como "Cartera pendiente"
// — ese dato pertenece a la vista Capacidad de /pedidos, no se duplica aquí.
// =============================================================================

const SERIES_DAYS = 365;
const STATUS_DOT: Record<OrderStatus, string> = {
  espera: "bg-border-strong",
  proceso: "bg-accent",
  calidad: "bg-success",
  enviado: "bg-ink",
};

type OrderRow = Pick<
  Order,
  "id" | "title" | "quantity" | "price" | "status" | "due_date" | "paid" | "product_id" | "channel" | "created_at" | "assigned_to"
>;
type ProductRow = {
  id: string;
  name: string;
  sale_price: number | null;
  target_margin_pct: number;
  labor_seconds: number;
  product_supplies: { quantity: number; supplies: { unit_cost: number; quantity_remaining: number; name: string } | null }[];
};

async function ExecutivePanel({ session, tenant, mod }: { session: Session; tenant: Tenant; mod: IndustryModule }) {
  const { supabase, user } = session;
  const now = new Date();
  const todayIso = now.toISOString().slice(0, 10);
  const tomorrowIso = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);
  const seriesStart = new Date(now.getTime() - SERIES_DAYS * 86400000).toISOString().slice(0, 10);
  const period30Start = new Date(now.getTime() - 29 * 86400000).toISOString().slice(0, 10);
  const prevPeriod30Start = new Date(now.getTime() - 59 * 86400000).toISOString().slice(0, 10);
  const activeLocationId = await getActiveLocationId();

  let txQuery = supabase
    .from("transactions")
    .select("amount, occurred_on")
    .eq("tenant_id", tenant.id)
    .eq("type", "ingreso")
    .gte("occurred_on", seriesStart);
  let ordersQuery = supabase
    .from("orders")
    .select("id, title, quantity, price, status, due_date, paid, product_id, channel, created_at, assigned_to, customers(name)")
    .eq("tenant_id", tenant.id)
    .gte("created_at", seriesStart);
  let suppliesQuery = supabase
    .from("supplies")
    .select("id, name, quantity_remaining, low_stock_threshold, locations(name)")
    .eq("tenant_id", tenant.id);
  if (activeLocationId) {
    txQuery = txQuery.eq("location_id", activeLocationId);
    ordersQuery = ordersQuery.eq("location_id", activeLocationId);
    suppliesQuery = suppliesQuery.eq("location_id", activeLocationId);
  }

  const [{ data: tx }, { data: orders }, { data: products }, { data: supplies }, { data: availability }] = await Promise.all([
    txQuery,
    ordersQuery,
    supabase
      .from("products")
      .select("id, name, sale_price, target_margin_pct, labor_seconds, product_supplies(quantity, supplies(unit_cost, quantity_remaining, name))")
      .eq("tenant_id", tenant.id),
    suppliesQuery,
    supabase.from("availability").select("user_id, hours").eq("tenant_id", tenant.id),
  ]);

  const txRows = tx ?? [];
  const orderRows = (orders ?? []) as unknown as (OrderRow & { customers: { name: string } | null })[];
  const productRows = (products ?? []) as unknown as ProductRow[];
  const supplyRows = (supplies ?? []) as unknown as { id: string; name: string; quantity_remaining: number; low_stock_threshold: number; locations: { name: string } | null }[];
  const hasAnyData = txRows.length > 0 || orderRows.length > 0;

  // --- KPI 1: ventas del período (30 días vs. los 30 anteriores) ---------
  const incomeByDay = new Map<string, number>();
  for (const t of txRows) incomeByDay.set(t.occurred_on, (incomeByDay.get(t.occurred_on) ?? 0) + Number(t.amount));
  const sumIncome = (from: string, to: string) =>
    txRows.filter((t) => t.occurred_on >= from && t.occurred_on < to).reduce((s, t) => s + Number(t.amount), 0);
  const income30 = sumIncome(period30Start, tomorrowIso);
  const incomePrev30 = sumIncome(prevPeriod30Start, period30Start);
  const salesDelta = periodChangePct(income30, incomePrev30);
  const salesSparkline = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(now.getTime() - (13 - i) * 86400000).toISOString().slice(0, 10);
    return incomeByDay.get(d) ?? 0;
  });

  // --- KPI 2: margen bruto del período (sobre pedidos pagados con patrón) ---
  const pricedProducts = productRows.filter((p) => p.sale_price && p.sale_price > 0);
  const costByProduct = new Map(
    pricedProducts.map((p) => [
      p.id,
      costBreakdown({
        lines: p.product_supplies.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies?.unit_cost ?? 0) })),
        laborSeconds: p.labor_seconds,
        hourlyRate: Number(tenant.hourly_rate),
        toolWearPct: Number(tenant.tool_wear_pct),
      }).total,
    ]),
  );
  const marginFor = (from: string, to: string) => {
    const sold = orderRows.filter((o) => o.paid && o.product_id && costByProduct.has(o.product_id) && o.created_at >= from && o.created_at < to);
    const revenue = sold.reduce((s, o) => s + Number(o.price) * o.quantity, 0);
    const cost = sold.reduce((s, o) => s + (costByProduct.get(o.product_id!) ?? 0) * o.quantity, 0);
    return revenue > 0 ? ((revenue - cost) / revenue) * 100 : null;
  };
  const margin30 = marginFor(period30Start, tomorrowIso);
  const marginPrev30 = marginFor(prevPeriod30Start, period30Start);
  const marginDeltaPts = margin30 !== null && marginPrev30 !== null ? Math.round(margin30 - marginPrev30) : null;

  // --- KPI 3: pedidos activos por estado + en riesgo -------------------
  const activeOrders = orderRows.filter((o) => o.status !== "enviado");
  const byStatus = { espera: 0, proceso: 0, calidad: 0 } as Record<"espera" | "proceso" | "calidad", number>;
  for (const o of activeOrders) if (o.status !== "enviado") byStatus[o.status]++;

  const outOfStockByProduct = new Map<string, string>();
  for (const p of productRows) {
    const empty = p.product_supplies.find((l) => Number(l.supplies?.quantity_remaining ?? 0) <= 0);
    if (empty?.supplies) outOfStockByProduct.set(p.id, empty.supplies.name);
  }

  // Quién está sobrecargada esta semana (comprometido > disponible), para la regla de
  // "Necesitan atención" — totales reales, no un reparto día a día inventado.
  const productLaborById = new Map(productRows.map((p) => [p.id, p.labor_seconds]));
  const assignedUserIds = new Set(orderRows.map((o) => o.assigned_to).filter((id): id is string => Boolean(id)));
  const overloadedUserIds = new Set(
    Array.from(assignedUserIds).filter((userId) => {
      const available = weeklyAvailableHours(availability ?? [], userId);
      const committed = committedHours(
        orderRows.map((o) => ({
          id: o.id,
          title: o.title,
          assigned_to: o.assigned_to,
          status: o.status,
          estimatedHoursValue: o.product_id ? estimatedHours(productLaborById.get(o.product_id) ?? 0, o.quantity) : 0,
          loggedSeconds: 0, // el panel compara comprometido total, no lo ya avanzado por pedido
        })),
        userId,
      );
      return committed > available;
    }),
  );

  const riskItems = ordersAtRisk(activeOrders, outOfStockByProduct, now, { overloadedUserIds });
  const riskyOrderIds = new Set(riskItems.map((r) => r.orderId));

  // --- KPI 4: cartera pendiente (reemplaza "Capacidad del taller": no hay
  // datos de disponibilidad todavía, Fase 3) --------------------------
  const unpaidOrders = orderRows.filter((o) => !o.paid && o.status !== "enviado");
  const pendingAmount = unpaidOrders.reduce((s, o) => s + Number(o.price) * o.quantity, 0);

  // --- Gráfico ingresos y utilidad: serie diaria real, 365 días --------
  const overallMarginFraction = pricedProducts.length > 0 ? (marginFor(seriesStart, tomorrowIso) ?? 0) / 100 : 0;
  const daily: DailyPoint[] = Array.from({ length: SERIES_DAYS }, (_, i) => {
    const d = new Date(now.getTime() - (SERIES_DAYS - 1 - i) * 86400000).toISOString().slice(0, 10);
    const income = incomeByDay.get(d) ?? 0;
    return { date: d, income, profit: income * overallMarginFraction };
  });

  // --- Rentabilidad por producto -----------------------------------
  const unitsSold = new Map<string, number>();
  for (const o of orderRows) {
    if (o.paid && o.product_id) unitsSold.set(o.product_id, (unitsSold.get(o.product_id) ?? 0) + o.quantity);
  }
  const profitability = productProfitability(
    productRows.map((p) => ({
      id: p.id,
      name: p.name,
      sale_price: p.sale_price,
      target_margin_pct: Number(p.target_margin_pct),
      labor_seconds: p.labor_seconds,
      lines: p.product_supplies.map((l) => ({ quantity: Number(l.quantity), unitCost: Number(l.supplies?.unit_cost ?? 0) })),
    })),
    unitsSold,
    Number(tenant.hourly_rate),
    Number(tenant.tool_wear_pct),
  );
  const worstBelowTarget = [...profitability].reverse().find((p) => p.belowTarget);

  // --- Ventas por canal (pedidos pagados del período) -------------------
  const channels = channelBreakdown(
    orderRows.filter((o) => o.paid && o.created_at >= period30Start).map((o) => ({ channel: o.channel, price: o.price, quantity: o.quantity })),
  );

  // --- Inventario crítico -----------------------------------------
  const criticalStock = supplyRows
    .filter((s) => Number(s.quantity_remaining) <= Number(s.low_stock_threshold))
    .sort((a, b) => Number(a.quantity_remaining) - Number(b.quantity_remaining))
    .slice(0, 4);

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const hour = Number(new Intl.DateTimeFormat("es-CO", { hour: "numeric", hour12: false, timeZone: "America/Bogota" }).format(now));
  const greeting = hour < 12 ? "Buenos días" : hour < 19 ? "Hola" : "Buenas noches";
  const attentionCount = riskyOrderIds.size;

  const profitColumns: Column<ProductProfitability>[] = [
    { key: "name", label: "Producto", render: (p) => <span className="font-medium">{p.name}</span> },
    { key: "units", label: "Unid.", align: "right", render: (p) => String(p.units) },
    { key: "price", label: "Precio", align: "right", render: (p) => money(p.price) },
    { key: "cost", label: "Costo", align: "right", render: (p) => <span className="text-muted">{money(p.cost)}</span> },
    {
      key: "margin",
      label: "Margen",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="flex-1">
            <ProgressBar value={Math.max(0, p.marginPct)} tone={p.belowTarget ? "warning" : "success"} />
          </div>
          <span className={`w-12 shrink-0 text-right text-[13px] font-semibold tabular-nums ${p.belowTarget ? "text-warning-ink" : ""}`}>
            {p.marginPct.toFixed(1).replace(".", ",")}%
          </span>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-[30px] leading-tight md:text-[36px]">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[15px] text-ink-2">
            {attentionCount > 0
              ? `Tienes ${attentionCount} pedido${attentionCount === 1 ? "" : "s"} que necesita${attentionCount === 1 ? "" : "n"} atención.`
              : "Nada necesita atención urgente hoy."}
          </p>
        </div>
      </div>

      {!hasAnyData ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <p className="font-display text-xl">Todavía no hay datos suficientes</p>
          <p className="text-sm text-muted">Registra ventas en Caja y crea pedidos: aquí vas a ver tu panel ejecutivo completo.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <KpiCard
              label="Ventas · 30 días"
              value={compactMoney(income30)}
              delta={salesDelta !== null ? { text: `${Math.abs(salesDelta)}%`, positive: salesDelta >= 0 } : undefined}
            >
              <Sparkline data={salesSparkline} className="h-9 w-full text-primary" />
            </KpiCard>
            <KpiCard
              label="Margen bruto"
              value={margin30 !== null ? `${margin30.toFixed(1).replace(".", ",")}%` : "—"}
              delta={marginDeltaPts !== null ? { text: `${Math.abs(marginDeltaPts)} pts`, positive: marginDeltaPts >= 0 } : undefined}
            />
            <KpiCard
              label="Pedidos activos"
              value={String(activeOrders.length)}
              delta={attentionCount > 0 ? { text: `${attentionCount} en riesgo`, positive: false } : undefined}
            >
              <div className="flex h-2 gap-0.5 overflow-hidden rounded-[4px]">
                {(["espera", "proceso", "calidad"] as const).map(
                  (s) => byStatus[s] > 0 && <div key={s} className={STATUS_DOT[s]} style={{ flex: byStatus[s] }} />,
                )}
              </div>
              <span className="text-xs text-muted">
                {byStatus.espera} espera · {byStatus.proceso} {mod.timer.activeVerb.toLowerCase()} · {byStatus.calidad} calidad
              </span>
            </KpiCard>
            <KpiCard
              label="Cartera pendiente"
              value={money(pendingAmount)}
              delta={unpaidOrders.length > 0 ? { text: `${unpaidOrders.length} pedidos`, positive: false } : undefined}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <RevenueProfitChart daily={daily} todayIso={todayIso} />
            <Panel title="Necesitan atención" action={<Link href="/pedidos" className="text-[13px] font-medium hover:underline">Ver pedidos</Link>}>
              {riskItems.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Nada necesita atención por ahora.</p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {riskItems.slice(0, 6).map((r, i) => (
                    <AlertRow key={`${r.orderId}-${i}`} tone={r.severity === "alta" ? "danger" : "warning"} title={r.title} detail={r.text} />
                  ))}
                </div>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Panel title="Rentabilidad por producto" action={<Link href="/recetario" className="text-[13px] font-medium hover:underline">Abrir recetario</Link>}>
              {profitability.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted">Pon precio a tus patrones en Recetario para ver su rentabilidad aquí.</p>
              ) : (
                <>
                  <DataTable columns={profitColumns} rows={profitability} rowKey={(p) => p.id} />
                  {worstBelowTarget && (
                    <p className="rounded-xl bg-surface-muted p-3 text-[13px] text-ink-2">
                      <strong className="text-ink">{worstBelowTarget.name}</strong> está por debajo de tu margen objetivo (
                      {money(worstBelowTarget.price)} con costo {money(worstBelowTarget.cost)}). Sube el precio o baja el costo para
                      volver al rango.
                    </p>
                  )}
                </>
              )}
            </Panel>

            <div className="flex flex-col gap-4">
              <Panel title="Ventas por canal">
                {channels.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Aún no hay ventas pagadas este período.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {channels.map((c) => (
                      <div key={c.channel} className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-sm">
                          <span>{c.channel}</span>
                          <span className="font-semibold tabular-nums">
                            {Math.round(c.pct)}% · {compactMoney(c.amount)}
                          </span>
                        </div>
                        <ProgressBar value={c.pct} />
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
              <Panel title="Inventario crítico" action={<Link href="/insumos" className="text-[13px] font-medium hover:underline">Ver todo</Link>}>
                {criticalStock.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">Nada por debajo del mínimo.</p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {criticalStock.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm">
                        <span>
                          {s.name}
                          {s.locations?.name ? ` · ${s.locations.name}` : ""}
                        </span>
                        <span className={`font-semibold ${Number(s.quantity_remaining) <= 0 ? "text-danger-ink" : "text-warning-ink"}`}>
                          {Number(s.quantity_remaining)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Panel>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
