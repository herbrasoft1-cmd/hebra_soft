import type { Unit } from "./types";

/** $15.000 — formato colombiano sin decimales. */
export function money(n: number | null | undefined): string {
  const v = Math.round(Number(n ?? 0));
  return "$" + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** Para costos unitarios pequeños: $0,6 en vez de $1. */
export function unitMoney(n: number): string {
  if (n >= 100) return money(n);
  return "$" + n.toFixed(n < 1 ? 2 : 1).replace(".", ",");
}

export function duration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} h ${m} m` : `${m} m`;
}

export function clock(seconds: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const s = Math.max(0, Math.floor(seconds));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

export const UNIT_LABEL: Record<Unit, { short: string; long: string }> = {
  g: { short: "g", long: "gramo" },
  m: { short: "m", long: "metro" },
  u: { short: "u", long: "unidad" },
  ml: { short: "ml", long: "mililitro" },
};

const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** "Hoy", "Mañana", "Vie 16" o "16 oct". */
export function dueLabel(date: string | null): string {
  if (!date) return "Sin fecha";
  const d = new Date(date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return `Vencido ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  if (diff === 0) return "Hoy";
  if (diff === 1) return "Mañana";
  if (diff < 7) return `${DAYS[d.getDay()]} ${d.getDate()}`;
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function todayLong(): string {
  return new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" })
    .format(new Date())
    .replace(/^\w/, (c) => c.toUpperCase());
}

/** Link directo a WhatsApp con mensaje (número colombiano por defecto). */
export function whatsappLink(phone: string | null | undefined, text?: string): string | null {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10) digits = "57" + digits;
  return `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
