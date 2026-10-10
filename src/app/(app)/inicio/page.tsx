import Link from "next/link";
import type { ComponentType } from "react";
import { Sparkline } from "@/components/charts";
import { IconAgujas, IconHebra, IconOvillo, IconTrendUp, IconWallet } from "@/components/icons";
import { dueLabel, initials, money, todayLong } from "@/lib/format";
import { getSession } from "@/lib/tenant";
import type { Order, Supply } from "@/lib/types";
import { getIndustryModule } from "@/modules";
import { HomeActions } from "./home-actions";

export const metadata = { title: "Inicio" };

const SPARK_DAYS = 14;

export default async function HomePage({ searchParams }: { searchParams: Promise<{ accion?: string }> }) {
  const { accion } = await searchParams;
  const { supabase, user, tenant } = await getSession();
  const mod = getIndustryModule(tenant.industry);
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
          className="icon-btn size-11 shrink-0 border border-line bg-surface shadow-xs md:hidden"
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
            <Link href="/pedidos" className="text-sm font-semibold text-primary-ink hover:underline">
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
                  className="flex items-center gap-3 border-b border-line px-4 py-3.5 transition-colors last:border-0 hover:bg-surface-2"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-semibold text-primary-ink">
                    {initials(o.customers?.name ?? "?")}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{o.title}</span>
                    <span className="truncate text-[13px] text-muted">
                      {o.customers?.name ?? "Sin cliente"} · {mod.statusLabels[o.status]}
                    </span>
                  </span>
                  <span className="chip bg-primary-soft text-primary-ink">{dueLabel(o.due_date)}</span>
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
                    className="card flex items-center gap-3.5 border-primary/15 bg-primary-soft/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface text-primary shadow-xs">
                      <IconOvillo size={22} />
                    </span>
                    <span className="flex flex-1 flex-col gap-1.5">
                      <span className="text-sm font-semibold">{s.name}</span>
                      <span className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <span className="block h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                      </span>
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
  sage: "bg-sage-soft text-sage-ink",
  primary: "bg-primary-soft text-primary-ink",
  ink: "bg-surface-2 text-ink-2",
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
        {spark && <Sparkline data={spark} className="h-6 w-14 text-sage md:w-16" />}
      </div>
      <span className="flex flex-col gap-0.5">
        <span className="truncate font-display text-base leading-tight font-semibold md:text-[26px]">{value}</span>
        <span className="truncate text-[10.5px] leading-tight text-muted md:text-[13px]">{label}</span>
      </span>
    </div>
  );
}
