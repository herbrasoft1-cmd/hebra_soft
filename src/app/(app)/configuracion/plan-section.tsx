import { ActivitySection, type AuditEntry } from "./activity-section";

/** Pestaña "Plan y seguridad" de Ent-Equipo.dc.html. HEBRA todavía no tiene planes de
 * suscripción, así que en vez de inventar un cupo (ej. "8 de 25 usuarios") se muestra el
 * uso real actual. Los 4 toggles de seguridad del mockup (SSO/2FA obligatoria/restricción
 * por IP/aprobación de exportaciones) no se construyen: un toggle que no aplica nada de
 * verdad es peor que no tenerlo — darían una falsa sensación de seguridad. */
export function PlanSection({
  membersCount,
  locationsCount,
  invoicesThisMonth,
  activity,
}: {
  membersCount: number;
  locationsCount: number;
  invoicesThisMonth: number;
  activity: AuditEntry[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="card flex flex-col gap-4 p-5">
        <div>
          <h2 className="font-display text-xl font-semibold">Tu plan</h2>
          <p className="text-sm text-ink-2">
            HEBRA todavía no tiene planes de suscripción con cupos — esto es tu uso real del sistema hoy.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1 rounded-xl bg-surface-muted p-4">
            <span className="font-display text-2xl font-semibold">{membersCount}</span>
            <span className="text-xs text-muted">Miembros del equipo</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-surface-muted p-4">
            <span className="font-display text-2xl font-semibold">{locationsCount}</span>
            <span className="text-xs text-muted">Sedes</span>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-surface-muted p-4">
            <span className="font-display text-2xl font-semibold">{invoicesThisMonth}</span>
            <span className="text-xs text-muted">Facturas generadas este mes</span>
          </div>
        </div>
      </section>

      <ActivitySection entries={activity} />
    </div>
  );
}
