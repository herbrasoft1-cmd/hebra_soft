import Link from "next/link";
import { dueLabel, todayLong } from "@/lib/format";
import { getActiveLocationId } from "@/lib/location";
import { getSession } from "@/lib/tenant";
import type { Order, OrderStatus, ProductStep, Tenant } from "@/lib/types";
import type { IndustryModule } from "@/modules";
import { ShiftPhoto } from "./shift-photo";
import { ShiftSteps } from "./shift-steps";
import { ShiftTimerCard } from "./shift-timer-card";

type Session = Awaited<ReturnType<typeof getSession>>;

const STATUS_DOT: Record<OrderStatus, string> = {
  espera: "bg-border-strong",
  proceso: "bg-accent",
  calidad: "bg-success",
  enviado: "bg-ink",
};

/**
 * "Mi turno" (Fase 8): inicio de la tejedora. No agrega un bottom-nav nuevo
 * (el mockup trae "Mi turno/Tareas/Patrones/Perfil") — reutiliza el actual
 * (Inicio/Insumos/Recetario/Pedidos), "Tareas" ya es Pedidos filtrado a lo
 * propio y "Patrones" ya es Recetario.
 */
export async function ShiftHome({ session, tenant, mod }: { session: Session; tenant: Tenant; mod: IndustryModule }) {
  const { supabase, user } = session;
  const activeLocationId = await getActiveLocationId();

  const [{ data: assigned }, { data: activeLocation }] = await Promise.all([
    supabase
      .from("orders")
      .select("*, customers(name)")
      .eq("tenant_id", tenant.id)
      .eq("assigned_to", user.id)
      .neq("status", "enviado")
      .order("due_date", { ascending: true, nullsFirst: false })
      .limit(2),
    activeLocationId ? supabase.from("locations").select("name").eq("id", activeLocationId).maybeSingle() : Promise.resolve({ data: null }),
  ]);

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
  const locationName = (activeLocation as { name: string } | null)?.name;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">
          {todayLong()}
          {locationName ? ` · ${locationName}` : ""}
        </span>
        <h1 className="font-display text-[30px] leading-tight md:text-[36px]">
          {greeting}
          {firstName ? `, ${firstName}` : ""}
        </h1>
      </div>

      {!current ? (
        <div className="card flex flex-col items-center gap-2 p-10 text-center">
          <p className="font-display text-xl">No tienes pedidos asignados</p>
          <p className="text-sm text-muted">Cuando te asignen un pedido, aquí vas a ver tu turno con el cronómetro y los pasos.</p>
        </div>
      ) : (
        <>
          {product && (
            <ShiftTimerCard
              orderId={current.id}
              orderShortId={current.id.slice(0, 6).toUpperCase()}
              title={current.title}
              quantity={current.quantity}
              dueDate={current.due_date}
              customerName={current.customers?.name ?? "Sin cliente"}
              productId={product.id}
              productName={product.name}
              goalSeconds={product.labor_seconds}
            />
          )}

          {steps.length > 0 && <ShiftSteps orderId={current.id} steps={steps} doneStepIds={doneStepIds} />}

          <ShiftPhoto orderId={current.id} photoUrl={current.progress_photo_url} />
        </>
      )}

      {next && (
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-xl font-semibold">Después</h2>
          <Link href="/pedidos" className="card flex items-center justify-between gap-3 p-4 transition-all hover:-translate-y-0.5">
            <span className="flex min-w-0 flex-1 items-center gap-2.5">
              <span className={`size-2.5 shrink-0 rounded-full ${STATUS_DOT[next.status]}`} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[15px] font-medium">
                  {next.title}
                  {next.quantity > 1 ? ` x${next.quantity}` : ""}
                </span>
                <span className="truncate text-[13px] text-muted">
                  {next.customers?.name ?? "Sin cliente"} · {mod.statusLabels[next.status]}
                </span>
              </span>
            </span>
            <span className="chip shrink-0 bg-surface-muted text-ink-2">{dueLabel(next.due_date)}</span>
          </Link>
        </section>
      )}
    </div>
  );
}
