import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/types";

type AuditEntry = {
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

export function ActivitySection({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Actividad</h2>
        <p className="text-sm text-ink-2">Los últimos cambios importantes en este negocio.</p>
      </div>
      <ul className="flex flex-col gap-0.5">
        {entries.map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-line py-2.5 last:border-0">
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
