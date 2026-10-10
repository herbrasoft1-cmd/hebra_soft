/**
 * Generador de remisiones (nota de venta) en PDF, en el navegador.
 * Pensado para compartir por WhatsApp desde el celular (Web Share API).
 * Para facturación electrónica: ver src/lib/invoicing.ts (punto de extensión).
 */
import { jsPDF } from "jspdf";
import { money } from "./format";

export type RemissionData = {
  number: number;
  date: Date;
  business: { name: string; whatsapp?: string | null; instagram?: string | null; logoUrl?: string | null };
  customer: { name: string; whatsapp?: string | null; address?: string | null } | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  paymentMethod: string;
  notes?: string | null;
};

const TERRACOTA: [number, number, number] = [168, 91, 69];
const CARBON: [number, number, number] = [45, 49, 46];
const MUTED: [number, number, number] = [107, 111, 108];
const LINO: [number, number, number] = [247, 242, 234];

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function buildRemissionPdf(d: RemissionData): Promise<Blob> {
  // Formato media carta vertical: se ve bien en el celular
  const doc = new jsPDF({ unit: "mm", format: [140, 216] });
  const W = 140;
  let y = 16;

  if (d.business.logoUrl) {
    const img = await toDataUrl(d.business.logoUrl);
    if (img) {
      try {
        doc.addImage(img, 12, y - 4, 18, 18);
      } catch {
        /* formato de imagen no soportado */
      }
    }
  }
  const textX = d.business.logoUrl ? 34 : 12;
  doc.setFont("helvetica", "bold").setFontSize(15).setTextColor(...CARBON);
  doc.text(d.business.name, textX, y + 2);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  const contact = [d.business.whatsapp && `WhatsApp ${d.business.whatsapp}`, d.business.instagram && `@${d.business.instagram.replace(/^@/, "")}`]
    .filter(Boolean)
    .join("  ·  ");
  if (contact) doc.text(contact, textX, y + 8);

  // Número y fecha
  doc.setFont("helvetica", "bold").setFontSize(9).setTextColor(...TERRACOTA);
  doc.text("REMISIÓN", W - 12, y, { align: "right" });
  doc.setFontSize(13).text(`N.º ${String(d.number).padStart(4, "0")}`, W - 12, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  doc.text(d.date.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" }), W - 12, y + 11, {
    align: "right",
  });

  // Hebra decorativa
  y += 20;
  doc.setDrawColor(201, 122, 99).setLineWidth(0.5);
  for (let x = 12; x < W - 12; x += 8) {
    doc.lines([[2, -1.6, 6, 1.6, 8, 0]], x, y, [1, 1], "S", false);
  }

  // Cliente
  y += 9;
  doc.setFontSize(8).setTextColor(...MUTED).text("CLIENTE", 12, y);
  doc.setFont("helvetica", "bold").setFontSize(11).setTextColor(...CARBON);
  doc.text(d.customer?.name ?? "Consumidor final", 12, y + 6);
  doc.setFont("helvetica", "normal").setFontSize(8.5).setTextColor(...MUTED);
  const cust = [d.customer?.whatsapp, d.customer?.address].filter(Boolean).join("  ·  ");
  if (cust) doc.text(doc.splitTextToSize(cust, W - 24), 12, y + 11);

  // Tabla de ítems
  y += 20;
  doc.setFillColor(...LINO).roundedRect(12, y, W - 24, 8, 2, 2, "F");
  doc.setFontSize(8).setTextColor(...MUTED);
  doc.text("Descripción", 15, y + 5.3);
  doc.text("Cant.", 86, y + 5.3, { align: "right" });
  doc.text("Total", W - 15, y + 5.3, { align: "right" });
  y += 13;

  let total = 0;
  doc.setTextColor(...CARBON).setFontSize(10);
  for (const it of d.items) {
    const lineTotal = it.quantity * it.unitPrice;
    total += lineTotal;
    const desc = doc.splitTextToSize(it.description, 64) as string[];
    doc.text(desc, 15, y);
    doc.text(String(it.quantity), 86, y, { align: "right" });
    doc.text(money(lineTotal), W - 15, y, { align: "right" });
    y += desc.length * 5 + 3;
  }

  doc.setDrawColor(226, 216, 204).setLineWidth(0.3).line(12, y, W - 12, y);
  y += 8;
  doc.setFont("helvetica", "bold").setFontSize(13).setTextColor(...CARBON);
  doc.text("Total", 15, y);
  doc.setTextColor(...TERRACOTA).text(money(total), W - 15, y, { align: "right" });

  y += 9;
  doc.setFont("helvetica", "normal").setFontSize(9).setTextColor(...MUTED);
  doc.text(`Método de pago: ${d.paymentMethod}`, 15, y);
  if (d.notes) {
    y += 6;
    doc.text(doc.splitTextToSize(d.notes, W - 30), 15, y);
  }

  doc.setFontSize(9).setTextColor(...TERRACOTA);
  doc.text("¡Gracias por apoyar lo hecho a mano!", W / 2, 200, { align: "center" });
  doc.setFontSize(7).setTextColor(...MUTED);
  doc.text("Documento soporte de venta · no es factura electrónica", W / 2, 206, { align: "center" });

  return doc.output("blob");
}

/** Comparte el PDF (WhatsApp, etc.) o lo descarga si el navegador no permite compartir archivos. */
export async function shareOrDownload(blob: Blob, filename: string, text: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename, text });
      return "shared" as const;
    } catch {
      /* el usuario canceló: caemos a descarga */
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return "downloaded" as const;
}
