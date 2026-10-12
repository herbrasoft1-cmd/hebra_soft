/**
 * Punto de extensión para facturación electrónica (DIAN u otros).
 *
 * Hoy HEBRA emite remisiones (documento soporte de venta) y registra cada intento
 * de factura electrónica en la tabla `invoices` (Fase 6), pero no hay ningún
 * proveedor conectado todavía — `getInvoicingProvider()` siempre devuelve el
 * `noopProvider` de abajo, que lanza un error claro en vez de fingir que funciona.
 *
 * Para conectar uno de verdad (ej. cuando crees tu cuenta de Alegra o Siigo):
 * 1. Crea un archivo nuevo, ej. `src/lib/invoicing/alegra.ts`, que implemente
 *    `InvoicingProvider` (`issue(req): Promise<InvoiceResult>`) llamando a la API
 *    real del proveedor.
 * 2. Lee las credenciales desde variables de entorno SIN el prefijo `NEXT_PUBLIC_`
 *    (para que nunca lleguen al navegador) — ej. `ALEGRA_EMAIL`/`ALEGRA_TOKEN` —
 *    agregadas a `.env.local` y a las variables de entorno de Vercel, nunca al
 *    código.
 * 3. En `getInvoicingProvider()` (abajo), devuelve ese proveedor nuevo si las env
 *    vars están presentes; si no, sigue devolviendo `noopProvider`.
 * El resto del app (la tabla `invoices`, la acción `createInvoice`, los botones de
 * "Emitir factura") no necesita ningún cambio — ya está escrito contra esta
 * interfaz.
 */
export type InvoiceRequest = {
  tenantId: string;
  orderId: string;
  customer: { name: string; documentNumber?: string; email?: string };
  items: { description: string; quantity: number; unitPrice: number; taxRate?: number }[];
  paymentMethod: string;
};

export type InvoiceResult = { provider: string; externalId: string; pdfUrl?: string; cufe?: string };

export interface InvoicingProvider {
  id: string;
  issue(req: InvoiceRequest): Promise<InvoiceResult>;
}

/** Proveedor por defecto: no emite factura (solo remisión). */
const noopProvider: InvoicingProvider = {
  id: "none",
  async issue() {
    throw new Error("La facturación electrónica aún no está configurada.");
  },
};

export function getInvoicingProvider(): InvoicingProvider {
  return noopProvider;
}
