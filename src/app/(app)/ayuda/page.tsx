import type { ReactNode } from "react";
import type { ComponentType } from "react";
import {
  IconCaja,
  IconChart,
  IconChevronDown,
  IconClientes,
  IconHebra,
  IconInicio,
  IconOvillo,
  IconRecetario,
  IconUser,
  IconWallet,
} from "@/components/icons";
import { PageHeader } from "@/components/ui/page-header";
import { canFully } from "@/lib/permissions";
import { getSession } from "@/lib/tenant";
import { ROLE_LABEL } from "@/lib/roles";

export const metadata = { title: "Ayuda" };

function GuideSection({
  title,
  icon: Icon,
  defaultOpen = false,
  children,
}: {
  title: string;
  icon: ComponentType<{ size?: number }>;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className="card group p-0">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-4 marker:content-none">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon size={18} />
        </span>
        <span className="flex-1 font-display text-[17px] font-semibold">{title}</span>
        <span className="text-muted transition-transform group-open:rotate-180">
          <IconChevronDown size={18} />
        </span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4 pl-[4.25rem] text-[14px] text-ink-2">{children}</div>
    </details>
  );
}

function Step({ children }: { children: ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}

export default async function HelpPage() {
  const { role } = await getSession();
  const isAdmin = canFully(role, "view_finance");
  const isVentas = role === "ventas";
  const isTejedora = role === "tejedora";

  return (
    <>
      <PageHeader title="Ayuda" subtitle={`Guía de HEBRA para tu rol: ${ROLE_LABEL[role]}.`} />
      <div className="flex max-w-2xl flex-col gap-3">
        <GuideSection title="Tu cuenta" icon={IconUser} defaultOpen>
          <Step>
            Toca tu nombre y foto (abajo del menú lateral en computador, o el círculo arriba a la
            derecha en el celular) para abrir <strong>Mi cuenta</strong>: ahí cambias tu nombre, entras
            a esta Ayuda, o cierras sesión.
          </Step>
          <Step>El reloj flotante (si usas el cronómetro) siempre muestra en qué pedido o patrón estás trabajando y te deja pausarlo desde cualquier pantalla.</Step>
        </GuideSection>

        {isTejedora && (
          <GuideSection title="Mi turno" icon={IconInicio} defaultOpen>
            <Step>Al entrar ves tu pedido asignado actual con el cronómetro grande: toca ▶ para empezar a tejer y ⏸ para pausar.</Step>
            <Step>La barra de abajo del reloj compara tu tiempo contra la meta del patrón — se pone roja si ya la pasaste, así sabes si conviene ajustar el patrón después.</Step>
            <Step>En "Pasos del patrón" vas marcando cada parte terminada (cabeza, cuerpo, etc.). En "Foto de avance" subes una foto del progreso — el cliente la ve si comparten el link de seguimiento.</Step>
            <Step>En "Pedidos" (menú) ves los que te asignaron y los que nadie ha tomado todavía. En "Recetario" puedes consultar el patrón, pero no ves precios ni costos.</Step>
          </GuideSection>
        )}

        {isVentas && (
          <GuideSection title="Pedidos" icon={IconHebra} defaultOpen>
            <Step>"+ Nuevo pedido" crea uno: elige cliente (o créalo ahí mismo), patrón, cantidad, precio y canal de venta.</Step>
            <Step>Arrastra la tarjeta entre columnas (o usa el botón verde "Empezar"/"Pasar a…") para mover el pedido por el flujo: espera → tejido → calidad → enviado.</Step>
            <Step>Cuando el pedido está en calidad o enviado, aparecen los botones "Remisión" (nota de venta en PDF) y "Factura" (factura electrónica, si el negocio tiene un proveedor conectado).</Step>
            <Step>El botón "Detalle" de cada tarjeta abre la vista completa: línea de tiempo, saldo pendiente y el link de seguimiento para compartir con el cliente.</Step>
          </GuideSection>
        )}
        {isVentas && (
          <GuideSection title="Clientes" icon={IconClientes}>
            <Step>Cada ficha muestra cuántos pedidos te ha hecho esa persona y cuánto ha comprado en total. El botón WhatsApp abre la conversación directo.</Step>
          </GuideSection>
        )}

        {isAdmin && (
          <>
            <GuideSection title="Panel ejecutivo (Inicio)" icon={IconInicio} defaultOpen>
              <Step>Ventas del período, margen bruto, pedidos activos y cartera pendiente, siempre con datos reales — nada ahí es un número de ejemplo.</Step>
              <Step>"Necesitan atención" junta en un solo lugar los pedidos vencidos o por vencer, sin tejedora asignada, o con un insumo agotado.</Step>
              <Step>"Rentabilidad por producto" te avisa cuando un patrón está vendiéndose por debajo del margen que definiste en Recetario.</Step>
            </GuideSection>

            <GuideSection title="Insumos" icon={IconOvillo}>
              <Step>"Nueva compra" registra lo que compraste; HEBRA calcula solo el costo por gramo/metro/unidad.</Step>
              <Step>El panel de "Órdenes de compra" avanza una compra por sus 4 estados; al marcarla "Recibida" sube el stock automáticamente. Si un insumo baja de su punto de reorden, HEBRA crea una orden en borrador sola.</Step>
              <Step>"Transferir entre sedes" mueve stock de una sede a otra — HEBRA te sugiere la transferencia cuando detecta que una sede tiene de más y otra la necesita para un pedido bloqueado.</Step>
            </GuideSection>

            <GuideSection title="Recetario y costeo" icon={IconRecetario}>
              <Step>Cada patrón tiene su cronómetro de talento, su lista de insumos, y el simulador de precio: elige canal de venta y margen objetivo, y te muestra el precio sugerido con el desglose completo.</Step>
              <Step>"Pasos del patrón" son los que la tejedora va marcando desde "Mi turno" — agrégalos aquí para que la guíen.</Step>
              <Step>"Publicar precio" guarda una versión nueva del precio; siempre puedes ver quién lo cambió y cuándo.</Step>
            </GuideSection>

            <GuideSection title="Pedidos y Capacidad" icon={IconHebra}>
              <Step>El tablero es igual al de Ventas, más la pestaña "Capacidad": cuánto tiene comprometido cada tejedora esta semana contra su disponibilidad, con sugerencia de a quién reasignar un pedido si alguien está sobrecargada.</Step>
            </GuideSection>

            <GuideSection title="Caja" icon={IconCaja}>
              <Step>Registro rápido de ventas y gastos del día. Usa la categoría "Gastos fijos" para los gastos recurrentes (arriendo, servicios) — así se reflejan en la cascada de Finanzas.</Step>
            </GuideSection>

            <GuideSection title="Finanzas" icon={IconWallet}>
              <Step>La cascada "De ingresos a utilidad" resta materiales, mano de obra, comisiones de canal y gastos fijos — todo calculado de tus datos reales, nunca inventado.</Step>
              <Step>"Cartera por antigüedad" agrupa el saldo pendiente de cada pedido según hace cuánto venció; cada cliente con saldo tiene su botón de recordatorio por WhatsApp.</Step>
              <Step>"+ Emitir factura" (o el botón "Factura" del Kanban) crea una factura electrónica real si ya conectaste un proveedor en Configuración; si no, queda registrada como rechazada con el motivo, para que la reintentes después.</Step>
            </GuideSection>

            <GuideSection title="Analítica" icon={IconChart}>
              <Step>Reportes históricos: ventas por mes, productos más rentables y gastos por categoría de los últimos 6 meses.</Step>
            </GuideSection>

            <GuideSection title="Equipo y roles" icon={IconClientes}>
              <Step>En Configuración → Equipo invitas a alguien por correo con un rol (Administración, Ventas o Tejedora). La pestaña "Roles y permisos" muestra exactamente qué puede hacer cada rol.</Step>
              <Step>Una tejedora o vendedora nunca ve costos, márgenes ni la caja — ni por pantalla ni pidiéndolo directo a la base de datos.</Step>
            </GuideSection>
          </>
        )}
      </div>
    </>
  );
}
