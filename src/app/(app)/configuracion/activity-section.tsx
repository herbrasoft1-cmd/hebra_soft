"use client";

import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/types";

export type AuditEntry = {
  id: string;
  email: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

const ENTITY_LABEL: Record<string, string> = {
  supply: "un insumo",
  product: "un patrón",
  order: "un pedido",
  customer: "un cliente",
  transaction: "un movimiento",
};

function describe(entry: AuditEntry): string {
  const who = entry.email ?? "Alguien";
  switch (entry.action) {
    case "invite_member":
      return `${who} invitó a ${String(entry.metadata.email ?? "alguien")} como ${ROLE_LABEL[entry.metadata.role as Role] ?? "miembro"}`;
    case "update_member_role":
      return `${who} cambió el rol de un miembro a ${ROLE_LABEL[entry.metadata.role as Role] ?? entry.metadata.role}`;
    case "remove_member":
      return `${who} quitó a un miembro del equipo`;
    case "update_tenant":
      return `${who} actualizó la configuración del negocio`;
    case "delete":
      return `${who} eliminó ${ENTITY_LABEL[entry.entity_type] ?? "un registro"}`;
    default:
      return `${who} hizo ${entry.action}`;
  }
}

function csvEscape(v: string) {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function downloadCsv(entries: AuditEntry[]) {
  const header = ["Fecha", "Quién", "Qué"];
  const lines = entries.map((e) =>
    [new Date(e.created_at).toLocaleString("es-CO"), e.email ?? "Alguien", describe(e)].map(csvEscape).join(","),
  );
  const csv = [header.join(","), ...lines].join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "hebra-actividad.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export function ActivitySection({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold">Actividad</h2>
          <p className="text-sm text-ink-2">Los últimos cambios importantes en este negocio.</p>
        </div>
        <button type="button" onClick={() => downloadCsv(entries)} className="btn-ghost min-h-10 px-4 text-sm">
          Exportar CSV
        </button>
      </div>
      <ul className="flex flex-col gap-0.5">
        {entries.map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-border py-2.5 last:border-0">
            <span className="text-sm text-ink-2">{describe(e)}</span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {new Date(e.created_at).toLocaleDateString("es-CO", { day: "numeric", month: "short" })}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
