import Link from "next/link";
import { redirect } from "next/navigation";
import { IconCaja, IconCheck, IconHebra, IconOvillo, IconRecetario, Logo, ThreadLine } from "@/components/icons";
import { money } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "HEBRA — Gestión integral de negocio" };

const FEATURES = [
  {
    icon: IconOvillo,
    title: "Insumos",
    detail: "Por sede y por lote",
    text: "Lo que compras y usas, con el punto de reorden siempre a la vista.",
    tone: "primary" as const,
  },
  {
    icon: IconRecetario,
    title: "Recetario",
    detail: "Costo real por pieza",
    text: "Materiales, mano de obra y desgaste, listo para fijar precio.",
    tone: "success" as const,
  },
  {
    icon: IconHebra,
    title: "Pedidos",
    detail: "De espera a envío",
    text: "Cronómetro de talento y seguimiento de pedido para tu cliente.",
    tone: "warning" as const,
  },
  {
    icon: IconCaja,
    title: "Caja y finanzas",
    detail: "Estado de resultados",
    text: "Ingresos, gastos y cartera en un solo lugar, con el número real.",
    tone: "night" as const,
  },
];

const TONE_STYLES = {
  primary: { badge: "bg-primary-soft text-primary", bar: "bg-primary" },
  success: { badge: "bg-success-soft text-success-ink", bar: "bg-success" },
  warning: { badge: "bg-warning-soft text-warning-ink", bar: "bg-warning" },
} as const;

const titleShadow = { textShadow: "0 6px 28px rgba(74, 46, 32, 0.16)" };
const titleShadowOnNight = { textShadow: "0 6px 28px rgba(0, 0, 0, 0.4)" };

const STEPS = ["Registra tus insumos", "Arma tu recetario", "Recibe el pedido", "Cobra con el precio justo"];

const EXAMPLE_SEGMENTS = [
  { label: "Materiales", amount: 3200, color: "#C9906F" },
  { label: "Mano de obra", amount: 6000, color: "#E2A285" },
  { label: "Desgaste", amount: 460, color: "#8A6A3B" },
];
const EXAMPLE_TOTAL = EXAMPLE_SEGMENTS.reduce((s, x) => s + x.amount, 0);
const EXAMPLE_PRICE = 16100;

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/inicio");

  return (
    <main className="pt-safe flex min-h-dvh flex-col overflow-x-hidden bg-bg">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6 md:px-8">
        <span className="flex items-center gap-2.5">
          <Logo size={32} />
          <span className="font-display text-xl font-semibold">hebra</span>
        </span>
        <Link href="/login" className="btn-primary min-h-10 px-5 text-sm">
          Iniciar sesión
        </Link>
      </header>

      {/* Hero */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        >
          <div className="absolute top-[-10%] left-[-10%] size-[420px] rounded-full bg-primary-soft opacity-70 blur-3xl md:size-[560px]" />
          <div className="absolute right-[-12%] top-[8%] size-[360px] rounded-full bg-success-soft opacity-60 blur-3xl md:size-[480px]" />
        </div>

        <div className="mx-auto grid w-full max-w-6xl gap-10 px-5 py-10 md:px-8 md:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-6">
          <div className="flex flex-col items-start gap-5 text-left">
            <span className="chip border border-border-strong bg-surface text-[13px] font-semibold text-ink-2">
              Gestión integral de negocio
            </span>
            <h1 className="font-display text-[38px] leading-[1.08] md:text-[56px]" style={titleShadow}>
              El costo real de cada pieza, no una estimación.
            </h1>
            <p className="max-w-lg text-[17px] leading-relaxed text-ink-2">
              HEBRA organiza insumos, recetario, pedidos y finanzas de negocios artesanales en un solo lugar — para
              que sepas exactamente cuánto cuesta y cuánto cobrar.
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <Link href="/login" className="btn-primary min-h-12 px-7 text-[15px]">
                Iniciar sesión
              </Link>
              <Link href="/registro" className="btn-ghost min-h-12 px-7 text-[15px]">
                Tengo una invitación
              </Link>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-2">
              {["Costeo real por pieza", "Un dato por negocio", "Pensado para talleres"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success-ink">
                    <IconCheck size={11} />
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </div>

          {/* Tarjeta ilustrativa: mismo patrón visual del simulador de precio real */}
          <div className="flex flex-col gap-3 rounded-[26px] border border-border bg-night p-6 text-on-night md:p-7">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-on-night-muted">Así se calcula un precio en HEBRA</span>
              <span className="chip bg-white/10 text-[11px] text-on-night-muted">Ejemplo</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm text-on-night-muted">Amigurumi Osito</span>
              <span className="font-display text-[40px] leading-none tabular-nums">{money(EXAMPLE_PRICE)}</span>
            </div>
            <div className="flex h-3 overflow-hidden rounded-md">
              {EXAMPLE_SEGMENTS.map((s) => (
                <div key={s.label} style={{ width: `${(s.amount / EXAMPLE_TOTAL) * 100}%`, background: s.color }} />
              ))}
              <div style={{ width: `${((EXAMPLE_PRICE - EXAMPLE_TOTAL) / EXAMPLE_PRICE) * 28}%`, background: "#7FB08F" }} />
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1 text-xs text-on-night-muted">
              {EXAMPLE_SEGMENTS.map((s) => (
                <span key={s.label} className="flex justify-between">
                  <span>{s.label}</span>
                  <span className="tabular-nums">{money(s.amount)}</span>
                </span>
              ))}
              <span className="flex justify-between text-success">
                <span>Utilidad</span>
                <span className="tabular-nums">{money(EXAMPLE_PRICE - EXAMPLE_TOTAL)}</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className="mx-auto w-full max-w-5xl px-5 pt-4 pb-14 md:px-8">
        <div className="relative grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4">
          <div className="absolute top-5 right-0 left-0 hidden md:block">
            <ThreadLine className="text-border-strong" />
          </div>
          {STEPS.map((step, i) => (
            <div key={step} className="relative flex flex-col items-start gap-2.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-surface font-display text-[15px] font-semibold">
                {i + 1}
              </span>
              <p className="text-sm font-medium text-ink-2">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Funciones */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
        <div className="mb-8 flex flex-col gap-2 text-center">
          <h2 className="font-display text-[28px] md:text-[32px]" style={titleShadow}>
            Todo tu taller, en un solo lugar
          </h2>
          <p className="text-[15px] text-ink-2">Cuatro piezas que trabajan juntas, no cuatro herramientas sueltas.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) =>
            f.tone === "night" ? (
              <div
                key={f.title}
                className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-night p-6 text-on-night transition-all hover:-translate-y-1"
              >
                <span className="absolute top-5 right-5 font-display text-sm text-on-night-muted">0{i + 1}</span>
                <span className="flex size-11 items-center justify-center rounded-full bg-white/10 text-on-night">
                  <f.icon size={21} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold">{f.title}</span>
                  <span className="text-[11px] font-semibold tracking-wide text-accent-light uppercase">{f.detail}</span>
                </span>
                <p className="text-sm text-on-night-muted">{f.text}</p>
              </div>
            ) : (
              <div
                key={f.title}
                className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-border bg-surface p-6 transition-all hover:-translate-y-1 hover:border-border-strong"
              >
                <div className={`absolute inset-x-0 top-0 h-1 ${TONE_STYLES[f.tone].bar}`} />
                <span className="absolute top-5 right-5 font-display text-sm text-muted">0{i + 1}</span>
                <span className={`flex size-11 items-center justify-center rounded-full ${TONE_STYLES[f.tone].badge}`}>
                  <f.icon size={21} />
                </span>
                <span className="flex flex-col gap-1">
                  <span className="font-display text-lg font-semibold">{f.title}</span>
                  <span className="text-[11px] font-semibold tracking-wide text-muted uppercase">{f.detail}</span>
                </span>
                <p className="text-sm text-ink-2">{f.text}</p>
              </div>
            ),
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-16 md:px-8">
        <div className="flex flex-col items-center gap-5 rounded-[28px] border border-border bg-night px-6 py-12 text-center text-on-night md:py-16">
          <h2 className="font-display text-[28px] md:text-[34px]" style={titleShadowOnNight}>
            ¿Ya tienes acceso a tu taller en HEBRA?
          </h2>
          <p className="max-w-md text-[15px] text-on-night-muted">
            Inicia sesión para seguir donde quedaste, o usa tu invitación si es tu primera vez.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link href="/login" className="btn-primary min-h-12 px-7 text-[15px]">
              Iniciar sesión
            </Link>
            <Link href="/registro" className="btn min-h-12 bg-white/10 px-7 text-[15px] text-on-night hover:bg-white/15">
              Tengo una invitación
            </Link>
          </div>
        </div>
      </section>

      <footer className="mx-auto flex w-full max-w-6xl flex-col items-center gap-2 px-5 py-8 text-center text-xs text-muted md:flex-row md:justify-between md:text-left">
        <span className="flex flex-col gap-0.5">
          <span>© {new Date().getFullYear()} HEBRA. Software de gestión.</span>
          <span>
            Hecho por{" "}
            <a
              href="https://jormeliasoft.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-ink-2 hover:text-ink hover:underline"
            >
              Jormelia Soft
            </a>
          </span>
        </span>
        <Link href="/privacidad" className="font-medium text-ink-2 hover:text-ink hover:underline">
          Tratamiento de datos y privacidad
        </Link>
      </footer>
    </main>
  );
}
