import Link from "next/link";
import { redirect } from "next/navigation";
import { IconCaja, IconHebra, IconOvillo, IconRecetario, Logo, ThreadLine } from "@/components/icons";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "HEBRA — Gestión integral de negocio" };

const FEATURES = [
  { icon: IconOvillo, title: "Insumos", text: "Controla lo que compras y usas, por sede y por lote, sin perder de vista el costo real." },
  { icon: IconRecetario, title: "Recetario", text: "Cada patrón con su costo exacto: materiales, mano de obra y desgaste, listo para fijar precio." },
  { icon: IconHebra, title: "Pedidos", text: "De la lista de espera al envío, con cronómetro de talento y seguimiento para tu cliente." },
  { icon: IconCaja, title: "Caja y finanzas", text: "Ingresos, gastos y cartera en un solo lugar, con el estado de resultados real de tu taller." },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/inicio");

  return (
    <main className="pt-safe flex min-h-dvh flex-col bg-surface-muted">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-6 md:px-8">
        <span className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-xl font-semibold">hebra</span>
        </span>
        <Link href="/login" className="btn-primary min-h-10 px-5 text-sm">
          Iniciar sesión
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center gap-5 px-5 py-14 text-center md:py-20">
        <h1 className="font-display text-[34px] leading-tight md:text-[48px]">Gestión integral para tu taller</h1>
        <p className="max-w-xl text-[17px] text-ink-2">
          HEBRA organiza insumos, recetario, pedidos y finanzas de negocios artesanales en un solo lugar — con el
          costo real de cada pieza, no una estimación.
        </p>
        <ThreadLine className="mt-1 w-48 text-accent" />
        <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
          <Link href="/login" className="btn-primary min-h-11 px-6">
            Iniciar sesión
          </Link>
          <Link href="/registro" className="btn-ghost min-h-11 px-6">
            Tengo una invitación
          </Link>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-5 pb-14 md:px-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="card flex flex-col gap-2.5 p-5">
              <span className="flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
                <f.icon size={20} />
              </span>
              <span className="font-display text-lg font-semibold">{f.title}</span>
              <p className="text-sm text-ink-2">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-5xl flex-col items-center gap-2 px-5 py-8 text-center text-xs text-muted md:flex-row md:justify-between md:text-left">
        <span>© {new Date().getFullYear()} HEBRA. Software de uso privado — no es un servicio público de autorregistro abierto.</span>
        <Link href="/privacidad" className="font-medium text-ink-2 hover:text-ink hover:underline">
          Tratamiento de datos y privacidad
        </Link>
      </footer>
    </main>
  );
}
