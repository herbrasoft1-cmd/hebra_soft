import type { ComponentType } from "react";
import { IconCaja, IconTrendDown, IconTrendUp, IconWallet } from "@/components/icons";
import { EmptyState, PageHeader } from "@/components/page-header";
import { RemissionButton } from "@/components/remission-button";
import { SubmitButton } from "@/components/submit-button";
import { money } from "@/lib/format";
import { getSession } from "@/lib/tenant";
import type { Transaction } from "@/lib/types";
import { deleteTransaction } from "./actions";
import { CashActions } from "./cash-actions";

export const metadata = { title: "Caja" };

export default async function CashPage() {
  const { supabase, tenant } = await getSession();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: tx }, { data: remissions }, { data: readyOrders }] = await Promise.all([
    supabase
      .from("transactions")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("occurred_on", monthStart)
      .order("occurred_on", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("remissions")
      .select("id, number, total, payment_method, created_at, orders(title, customers(name))")
      .eq("tenant_id", tenant.id)
      .order("number", { ascending: false })
      .limit(8),
    supabase
      .from("orders")
      .select("id, title, price, quantity, customers(name)")
      .eq("tenant_id", tenant.id)
      .in("status", ["calidad", "enviado"])
      .order("updated_at", { ascending: false })
      .limit(6),
  ]);

  const list = (tx ?? []) as Transaction[];
  const income = list.filter((t) => t.type === "ingreso").reduce((s, t) => s + Number(t.amount), 0);
  const expense = list.filter((t) => t.type === "gasto").reduce((s, t) => s + Number(t.amount), 0);
  const monthName = now.toLocaleDateString("es-CO", { month: "long" });

  type RemRow = { id: string; number: number; total: number; payment_method: string | null; created_at: string; orders: { title: string; customers: { name: string } | null } | null };
  type ReadyRow = { id: string; title: string; price: number; quantity: number; customers: { name: string } | null };

  return (
    <>
      <PageHeader title="Caja" subtitle={`Movimientos de ${monthName}`} action={<CashActions />} />

      <div className="mb-7 grid grid-cols-3 gap-3">
        <Stat label="Ingresos" value={money(income)} icon={IconTrendUp} tone="sage" />
        <Stat label="Gastos" value={money(expense)} icon={IconTrendDown} tone="primary" />
        <Stat label="Balance" value={money(income - expense)} icon={IconWallet} tone="ink" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Movimientos</h2>
          {list.length === 0 ? (
            <EmptyState
              icon={IconCaja}
              title="Aún no hay movimientos"
              text="Registra tu primera venta o gasto del mes con el botón de arriba."
            />
          ) : (
            <ul className="card flex flex-col">
              {list.map((t) => (
                <li key={t.id} className="flex items-center gap-3 border-b border-line px-4 py-3 last:border-0">
                  <span className={`size-2.5 shrink-0 rounded-full ${t.type === "ingreso" ? "bg-sage" : "bg-primary"}`} />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-[15px] font-medium">{t.description || t.category}</span>
                    <span className="text-xs text-muted">
                      {t.category}
                      {t.payment_method ? ` · ${t.payment_method}` : ""} · {t.occurred_on}
                    </span>
                  </span>
                  <span className={`text-[15px] font-semibold tabular-nums ${t.type === "gasto" ? "text-primary-ink" : ""}`}>
                    {t.type === "gasto" ? "−" : "+"}
                    {money(t.amount)}
                  </span>
                  <form action={deleteTransaction}>
                    <input type="hidden" name="id" value={t.id} />
                    <SubmitButton className="btn min-h-10 px-2 text-xs text-muted" pendingText="…">
                      Quitar
                    </SubmitButton>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-xl font-semibold">Remisión express</h2>
            <p className="text-sm text-ink-2">Pedidos listos o enviados: genera la nota de venta y compártela por WhatsApp.</p>
            {((readyOrders ?? []) as unknown as ReadyRow[]).map((o) => (
              <div key={o.id} className="card flex items-center gap-3 p-3.5">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-semibold">{o.title}</span>
                  <span className="text-xs text-muted">
                    {o.customers?.name ?? "Sin cliente"} · {money(Number(o.price) * Number(o.quantity))}
                  </span>
                </span>
                <RemissionButton orderId={o.id} className="btn-ghost min-h-11 px-3 text-sm" />
              </div>
            ))}
            {(readyOrders ?? []).length === 0 && <p className="text-sm text-muted">No hay pedidos listos todavía.</p>}
          </section>

          {(remissions ?? []).length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold text-ink-2">Últimas remisiones</h3>
              <ul className="card flex flex-col text-sm">
                {((remissions ?? []) as unknown as RemRow[]).map((r) => (
                  <li key={r.id} className="flex justify-between gap-2 border-b border-line px-4 py-2.5 last:border-0">
                    <span className="truncate">
                      N.º {String(r.number).padStart(4, "0")} · {r.orders?.customers?.name ?? r.orders?.title}
                    </span>
                    <span className="tabular-nums">{money(r.total)}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}

const STAT_TONE = {
  sage: { badge: "bg-sage-soft text-sage-ink", text: "text-sage-ink" },
  primary: { badge: "bg-primary-soft text-primary-ink", text: "text-primary-ink" },
  ink: { badge: "bg-surface-2 text-ink-2", text: "text-ink" },
} as const;

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ size?: number }>;
  tone: keyof typeof STAT_TONE;
}) {
  return (
    <div className="card flex flex-col gap-2 p-2.5 md:gap-3 md:p-5">
      <span className={`flex size-7 shrink-0 items-center justify-center rounded-full md:size-9 ${STAT_TONE[tone].badge}`}>
        <Icon size={15} />
      </span>
      <span className="flex flex-col gap-0.5">
        <span className={`truncate font-display text-base leading-tight font-semibold md:text-[26px] ${STAT_TONE[tone].text}`}>
          {value}
        </span>
        <span className="truncate text-[10.5px] leading-tight text-muted md:text-[13px]">{label}</span>
      </span>
    </div>
  );
}
