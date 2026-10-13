"use client";

import { useState } from "react";
import { money } from "@/lib/format";
import type { InvoiceStatus } from "@/lib/types";
import { retryInvoice } from "./actions";

export type DocRow = {
  kind: "factura" | "remision";
  id: string;
  num: string;
  client: string;
  date: string;
  total: number;
  status: InvoiceStatus | "enviada";
  errorMessage: string | null;
  pdfUrl: string | null;
};

const STATUS_LABEL: Record<DocRow["status"], string> = {
  enviando: "Enviando…",
  aceptada_dian: "Aceptada DIAN",
  rechazada: "Rechazada",
  enviada: "Remisión enviada",
};
const STATUS_TONE: Record<DocRow["status"], string> = {
  enviando: "bg-warning-soft text-warning-ink",
  aceptada_dian: "bg-success-soft text-success-ink",
  rechazada: "bg-danger-soft text-danger-ink",
  enviada: "bg-surface-muted text-ink-2",
};

const TABS = [
  { key: "all", label: "Todos" },
  { key: "factura", label: "Facturas electrónicas" },
  { key: "remision", label: "Remisiones" },
] as const;

export function DocumentsTable({ docs }: { docs: DocRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("all");
  const [retrying, setRetrying] = useState<string | null>(null);
  // Sembrado con el error real que ya trae cada fila desde el servidor — antes solo se llenaba
  // tras un reintento, así que una factura rechazada en la carga inicial no mostraba su motivo.
  const [errors, setErrors] = useState<Record<string, string>>(() =>
    Object.fromEntries(docs.filter((d) => d.errorMessage).map((d) => [d.id, d.errorMessage!])),
  );
  const filtered = docs.filter((d) => tab === "all" || d.kind === tab);

  const retry = async (id: string) => {
    setRetrying(id);
    const res = await retryInvoice(id);
    setRetrying(null);
    if (res.error) setErrors((e) => ({ ...e, [id]: res.error! }));
    else setErrors((e) => ({ ...e, [id]: res.invoice?.error_message ?? "" }));
  };

  return (
    <div className="flex flex-col gap-3">
      <div role="tablist" className="flex w-fit gap-0.5 rounded-[10px] bg-surface-muted p-0.5">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`min-h-8 rounded-lg px-3 text-[13px] font-medium transition-colors ${
              tab === t.key ? "bg-surface shadow-sm" : "text-muted"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Sin documentos todavía.</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex min-w-[640px] flex-col text-sm">
            <div className="grid grid-cols-[100px_minmax(160px,2fr)_100px_110px_minmax(160px,1.4fr)_100px] gap-3 border-b border-border py-2 text-xs text-muted">
              <span>Número</span>
              <span>Cliente</span>
              <span>Fecha</span>
              <span className="text-right">Total</span>
              <span>Estado</span>
              <span />
            </div>
            {filtered.map((d) => (
              <div key={d.id} className="grid grid-cols-[100px_minmax(160px,2fr)_100px_110px_minmax(160px,1.4fr)_100px] items-center gap-3 border-b border-border py-2.5 last:border-0">
                <span className="font-mono text-xs">{d.num}</span>
                <span className="truncate">{d.client}</span>
                <span className="text-ink-2">{new Date(d.date).toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}</span>
                <span className="text-right font-medium">{money(d.total)}</span>
                <span className="flex flex-col gap-0.5">
                  <span className={`chip w-fit text-[11px] ${STATUS_TONE[d.status]}`}>{STATUS_LABEL[d.status]}</span>
                  {errors[d.id] && <span className="text-[11px] text-danger-ink">{errors[d.id]}</span>}
                </span>
                <span className="flex justify-end gap-1.5">
                  {d.pdfUrl && (
                    <a href={d.pdfUrl} target="_blank" rel="noreferrer" className="btn-ghost min-h-9 px-2.5 text-xs">
                      Ver PDF
                    </a>
                  )}
                  {d.kind === "factura" && d.status === "rechazada" && (
                    <button onClick={() => retry(d.id)} disabled={retrying === d.id} className="btn-ghost min-h-9 px-2.5 text-xs">
                      {retrying === d.id ? "…" : "Reintentar"}
                    </button>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
