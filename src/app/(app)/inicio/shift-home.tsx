import Link from "next/link";
import { IconAgujas } from "@/components/icons";
import { dueLabel, todayLong } from "@/lib/format";
import { getSession } from "@/lib/tenant";
import type { Order, ProductStep, Tenant } from "@/lib/types";
import type { IndustryModule } from "@/modules";
import { ShiftPhoto } from "./shift-photo";
import { ShiftSteps } from "./shift-steps";
import { ShiftTimerCard } from "./shift-timer-card";

type Session = Awaited<ReturnType<typeof getSession>>;

/**
 * "Mi turno" (Fase 8): inicio de la tejedora. No agrega un bottom-nav nuevo
 * (el mockup trae "Mi turno/Tareas/Patrones/Perfil") — reutiliza el actual
 * (Inicio/Insumos/Recetario/Pedidos), "Tareas" ya es Pedidos filtrado a lo
 * propio y "Patrones" ya es Recetario.
 */
export async function ShiftHome({ session, tenant, mod }: { session: Session; tenant: Tenant; mod: IndustryModule }) {
  const { supabase, user } = session;

  const { data: assigned } = await supabase
    .from("orders")
    .select("*, customers(name)")
    .eq("tenant_id", tenant.id)
    .eq("assigned_to", user.id)
    .neq("status", "enviado")
    .order("due_date", { ascending: true, nullsFirst: false })
    .limit(2);

  const orders = (assigned ?? []) as (Order & { customers: { name: string } | null })[];
  const current = orders[0];
  const next = orders[1];

  const product = current?.product_id
    ? (
        await supabase.from("products").select("id, name, labor_seconds").eq("id", current.product_id).maybeSingle()
      ).data
    : null;

  let steps: ProductStep[] = [];
  let doneStepIds: string[] = [];
  if (current && product) {
    const [{ data: stepRows }, { data: progressRows }] = await Promise.all([
      supabase.from("product_steps").select("*").eq("product_id", product.id).order("position"),
      supabase.from("order_step_progress").select("step_id").eq("order_id", current.id),
    ]);
    steps = (stepRows ?? []) as ProductStep[];
    doneStepIds = (progressRows ?? []).map((r) => r.step_id as string);
  }

  const firstName = (user.user_metadata?.full_name as string | undefined)?.split(" ")[0];
  const now = new Date();
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
        </div>
        <Link href="/configuracion" aria-label="Configuración" className="icon-btn size-11 shrink-0 border border-border bg-surface md:hidden">
          <IconAgujas size={22} />
        </Link>
      </div>

      {!current ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <p className="font-display text-xl">No tienes pedidos asignados</p>
          <p className="text-sm text-muted">Cuando te asignen un pedido, aquí vas a ver tu turno con el cronómetro y los pasos.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted">#{current.id.slice(0, 6).toUpperCase()}</span>
              <span className="chip bg-primary-soft text-primary-hover">{dueLabel(current.due_date)}</span>
            </div>
            <h2 className="font-display text-2xl font-semibold">
              {current.title}
              {current.quantity > 1 ? ` x${current.quantity}` : ""}
            </h2>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted">{current.customers?.name ?? "Sin cliente"}</span>
              <Link href={`/pedidos/${current.id}`} className="text-sm font-medium text-primary-hover hover:underline">
                Ver detalle
              </Link>
            </div>
          </div>

          {product && <ShiftTimerCard orderId={current.id} productId={product.id} productName={product.name} goalSeconds={product.labor_seconds} />}

          {steps.length > 0 && <ShiftSteps orderId={current.id} steps={steps} doneStepIds={doneStepIds} />}

          <ShiftPhoto orderId={current.id} photoUrl={current.progress_photo_url} />
        </>
      )}

      {next && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Después</h2>
          <Link href="/pedidos" className="card flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5">
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[15px] font-medium">
                {next.title}
                {next.quantity > 1 ? ` x${next.quantity}` : ""}
              </span>
              <span className="truncate text-[13px] text-muted">
                {next.customers?.name ?? "Sin cliente"} · {mod.statusLabels[next.status]}
              </span>
            </span>
            <span className="chip shrink-0 bg-surface-muted text-ink-2">{dueLabel(next.due_date)}</span>
          </Link>
        </section>
      )}
    </div>
  );
}
