import Image from "next/image";
import { notFound } from "next/navigation";
import { Logo } from "@/components/icons";
import { money, whatsappLink } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { OrderStatus } from "@/lib/types";

export const metadata = { title: "Seguimiento de tu pedido" };

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "espera", label: "Recibido" },
  { status: "proceso", label: "En producción" },
  { status: "calidad", label: "Revisión final" },
  { status: "enviado", label: "En camino" },
];

type Tracking = {
  order_id: string;
  title: string;
  product_name: string | null;
  status: OrderStatus;
  due_date: string | null;
  customer_first_name: string | null;
  total: number;
  paid: boolean;
  balance: number;
  progress_photo_url: string | null;
  tenant_name: string;
  tenant_logo_url: string | null;
  tenant_whatsapp: string | null;
};

export default async function TrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const { data } = await supabase.rpc("get_order_tracking", { p_token: token }).maybeSingle();
  const tracking = data as Tracking | null;
  if (!tracking) notFound();

  const currentIdx = STEPS.findIndex((s) => s.status === tracking.status);
  const wa = whatsappLink(tracking.tenant_whatsapp, `Hola, te escribo por mi pedido "${tracking.title}".`);
  const payWa = whatsappLink(
    tracking.tenant_whatsapp,
    `Hola, quiero pagar el saldo de ${money(tracking.balance)} de mi pedido "${tracking.title}".`,
  );

  return (
    <main className="flex min-h-dvh justify-center bg-surface-muted px-4 py-8">
      <div className="flex w-full max-w-md flex-col gap-6">
        <header className="flex flex-col items-center gap-2 text-center">
          {tracking.tenant_logo_url ? (
            <Image src={tracking.tenant_logo_url} alt={tracking.tenant_name} width={56} height={56} unoptimized className="rounded-full object-cover" />
          ) : (
            <Logo size={48} />
          )}
          <span className="font-display text-lg font-semibold">{tracking.tenant_name}</span>
          <p className="text-sm text-ink-2">
            Hola{tracking.customer_first_name ? ` ${tracking.customer_first_name}` : ""}, tu pedido va por buen camino.
          </p>
        </header>

        <section className="card flex flex-col gap-4 p-5">
          <div>
            <span className="font-mono text-xs text-muted">#{tracking.order_id.slice(0, 6).toUpperCase()}</span>
            <h1 className="font-display text-xl font-semibold">{tracking.product_name ?? tracking.title}</h1>
          </div>

          <ol className="flex flex-col gap-0">
            {STEPS.map((s, i) => {
              const done = i < currentIdx || tracking.status === "enviado";
              const active = i === currentIdx && tracking.status !== "enviado";
              return (
                <li key={s.status} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className={`flex size-3 shrink-0 rounded-full ${done || active ? "bg-primary" : "bg-border-strong"}`} />
                    {i < STEPS.length - 1 && <span className={`w-0.5 flex-1 ${done ? "bg-primary" : "bg-border"}`} style={{ minHeight: 28 }} />}
                  </div>
                  <div className="pb-5">
                    <p className={`text-sm ${active ? "font-semibold text-ink" : done ? "text-ink-2" : "text-muted"}`}>{s.label}</p>
                    {active && <p className="text-xs text-muted">Va en proceso ahora mismo.</p>}
                  </div>
                </li>
              );
            })}
          </ol>
          {tracking.due_date && <p className="text-sm text-ink-2">Entrega estimada: {new Date(tracking.due_date + "T00:00:00").toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}</p>}
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-ink-2">Foto de avance</h2>
          {tracking.progress_photo_url ? (
            <div className="relative aspect-video overflow-hidden rounded-2xl">
              <Image src={tracking.progress_photo_url} alt="Avance del pedido" fill unoptimized className="object-cover" />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl border border-dashed border-border-strong text-center text-sm text-muted">
              Todavía no hay foto de avance
            </div>
          )}
        </section>

        <section className="card flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted">{tracking.title}</span>
            <span className="font-semibold tabular-nums">{money(tracking.total)}</span>
          </div>
          {tracking.total - tracking.balance > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted">Anticipo pagado</span>
              <span className="tabular-nums text-success-ink">− {money(tracking.total - tracking.balance)}</span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-border pt-2.5 text-[15px] font-semibold">
            <span>{tracking.balance <= 0 ? "Pagado" : "Saldo"}</span>
            <span className={tracking.balance <= 0 ? "text-success-ink" : ""}>{money(tracking.balance)}</span>
          </div>
          {tracking.balance > 0 && payWa && (
            <a href={payWa} target="_blank" rel="noreferrer" className="btn-primary min-h-11 text-center text-sm">
              Pagar saldo por WhatsApp
            </a>
          )}
        </section>

        {wa && (
          <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost min-h-11 text-center text-sm">
            Escribirnos por WhatsApp
          </a>
        )}

        <p className="text-center text-xs text-muted">
          Seguimiento con tecnología de <strong>hebra</strong>
        </p>
      </div>
    </main>
  );
}
