/** Catálogo de integraciones de Ent-Equipo.dc.html. Ninguna está conectada todavía — mismo
 * criterio que src/lib/invoicing.ts: mostrar el estado real ("No conectada") en vez de fingir
 * un "Conectado" que no existe. Cuando se conecte alguna de verdad, este archivo es el punto
 * para agregar su botón "Configurar" real. */
const INTEGRATIONS = [
  { name: "WhatsApp Business", description: "Confirmaciones y seguimiento de pedidos automáticos por WhatsApp." },
  { name: "Instagram Shopping", description: "Sincroniza tu catálogo con tu tienda de Instagram." },
  { name: "Wompi", description: "Cobra el saldo del portal de seguimiento con tarjeta, PSE o Nequi." },
  { name: "Coordinadora", description: "Genera guías de envío automáticamente al marcar un pedido como enviado." },
  { name: "Shopify", description: "Sincroniza pedidos y catálogo con tu tienda Shopify." },
  { name: "Siigo", description: "Factura electrónica conectada a tu contabilidad (ver src/lib/invoicing.ts)." },
  { name: "Alegra", description: "Factura electrónica conectada a tu contabilidad (ver src/lib/invoicing.ts)." },
  { name: "Google Drive", description: "Respalda fotos de avance y documentos automáticamente." },
  { name: "API y webhooks", description: "Conecta HEBRA con tus propias herramientas." },
];

export function IntegrationsSection() {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Integraciones</h2>
        <p className="text-sm text-ink-2">
          Ninguna está conectada todavía. Te avisaremos aquí en cuanto una esté disponible de verdad.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {INTEGRATIONS.map((i) => (
          <li key={i.name} className="flex flex-col gap-2 rounded-xl border border-border p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-medium">{i.name}</span>
              <span className="chip bg-surface-muted text-xs text-muted">No conectada</span>
            </div>
            <p className="text-sm text-ink-2">{i.description}</p>
            <button type="button" disabled className="btn-ghost min-h-9 self-start px-3 text-sm text-muted opacity-60">
              Próximamente
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
