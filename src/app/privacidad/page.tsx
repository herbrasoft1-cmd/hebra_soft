import Link from "next/link";
import { IconBack, Logo } from "@/components/icons";

export const metadata = {
  title: "Tratamiento de datos y privacidad",
  description: "Cómo HEBRA trata los datos de quienes usan el software, conforme a la Ley 1581 de 2012 (Colombia).",
  alternates: { canonical: "/privacidad" },
};

export default function PrivacyPage() {
  return (
    <main className="pt-safe flex min-h-dvh flex-col bg-surface-muted">
      <header className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-6">
        <Link href="/" className="inline-flex min-h-11 items-center gap-2 text-sm text-muted">
          <IconBack size={18} /> Inicio
        </Link>
      </header>

      <article className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-5 pb-16">
        <div className="flex flex-col items-center gap-3 pb-2 text-center">
          <Logo size={40} />
          <h1 className="font-display text-[28px] leading-tight md:text-[34px]">Tratamiento de datos y privacidad</h1>
          <p className="text-sm text-muted">Última actualización: {new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" })}</p>
        </div>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">1. Carácter privado de este software</h2>
          <p className="text-sm text-ink-2">
            HEBRA es un software de gestión interna para negocios artesanales. No es un servicio público de
            autoregistro masivo: el acceso está pensado para el equipo de los negocios que lo usan, normalmente por
            invitación directa de quien administra la cuenta. Este documento describe cómo se tratan los datos
            dentro de ese uso privado, no bajo el estándar de una plataforma de consumo masivo.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">2. Responsable del tratamiento</h2>
          <p className="text-sm text-ink-2">
            El negocio que crea la cuenta en HEBRA (el "negocio titular") es responsable del tratamiento de los
            datos de sus clientes, insumos, pedidos y finanzas que registra en el sistema. HEBRA actúa como
            encargado del tratamiento: provee la plataforma técnica y almacena esa información en nombre del
            negocio titular, sin usarla para fines propios distintos de operar el servicio.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">3. Qué datos se recopilan</h2>
          <ul className="flex flex-col gap-2 text-sm text-ink-2">
            <li>
              <strong className="text-ink">Cuenta de equipo:</strong> nombre, correo y rol de cada persona que
              accede al sistema (propietario, administración, ventas, tejedora).
            </li>
            <li>
              <strong className="text-ink">Operación del negocio:</strong> insumos, recetario, pedidos, clientes,
              proveedores, transacciones de caja y documentos de venta que el negocio titular decide registrar.
            </li>
            <li>
              <strong className="text-ink">Clientes finales del negocio:</strong> nombre, WhatsApp, dirección y
              datos del pedido que el negocio titular ingresa para poder atenderlos y, si el negocio lo activa,
              compartir un enlace de seguimiento con ellos.
            </li>
            <li>
              <strong className="text-ink">Uso técnico:</strong> fecha de último acceso y estado de verificación en
              dos pasos de cada cuenta, con fines de seguridad de la propia cuenta.
            </li>
          </ul>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">4. Para qué se usan</h2>
          <p className="text-sm text-ink-2">
            Únicamente para operar las funciones de HEBRA que el negocio titular usa: calcular costos reales,
            organizar pedidos, llevar caja y finanzas, y permitir que el equipo del negocio haga su trabajo diario.
            Los datos no se usan para publicidad, no se venden ni se comparten con terceros para fines comerciales
            ajenos al negocio titular.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">5. Dónde se almacenan y cómo se protegen</h2>
          <p className="text-sm text-ink-2">
            Los datos se almacenan en infraestructura con controles de acceso por negocio: un negocio nunca puede
            ver los datos de otro, y cada persona accede con su propia cuenta autenticada. Dentro de cada negocio,
            quién puede ver costos, finanzas o datos de clientes depende del rol asignado por quien administra la
            cuenta.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">6. Base legal</h2>
          <p className="text-sm text-ink-2">
            Este tratamiento se rige por la Ley 1581 de 2012 y el Decreto 1377 de 2013 de Colombia (régimen de
            protección de datos personales — Habeas Data). La base del tratamiento es el consentimiento otorgado al
            crear una cuenta o aceptar una invitación, y la ejecución de la relación entre el negocio titular y las
            personas de su equipo o sus clientes.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">7. Derechos de los titulares</h2>
          <p className="text-sm text-ink-2">
            Como titular de tus datos (persona del equipo o cliente final de un negocio que usa HEBRA) puedes
            solicitar en cualquier momento: conocer qué datos tuyos están registrados, pedir su corrección o
            actualización, solicitar su eliminación cuando ya no sean necesarios, y revocar tu autorización. Para
            datos de cuenta de equipo, el canal más directo es quien administra el negocio en HEBRA; para cualquier
            otra solicitud sobre el tratamiento de la plataforma, puedes escribir al correo de contacto del negocio
            titular con el que interactúas.
          </p>
        </section>

        <section className="card flex flex-col gap-2.5 p-5">
          <h2 className="font-display text-lg font-semibold">8. Cambios a este documento</h2>
          <p className="text-sm text-ink-2">
            Si el alcance del tratamiento cambia de forma relevante, esta página se actualiza y se indica la fecha
            de la última revisión arriba.
          </p>
        </section>
      </article>
    </main>
  );
}
