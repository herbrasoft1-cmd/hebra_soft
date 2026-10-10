/**
 * Punto de extensión para facturación electrónica (DIAN u otros).
 *
 * Hoy HEBRA emite remisiones (documento soporte de venta). Cuando quieras conectar
 * un proveedor tecnológico de facturación, implementa esta interfaz en un archivo
 * nuevo (ej. src/lib/invoicing/proveedor-x.ts) y cámbialo en `getInvoicingProvider`.
 * El resto del app no necesita cambios.
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
