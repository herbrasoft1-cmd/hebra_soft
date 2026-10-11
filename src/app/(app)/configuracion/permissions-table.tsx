import { permissionMatrix, ROLES_IN_ORDER, type PermissionValue } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/roles";

function Cell({ value }: { value: PermissionValue }) {
  if (value === true) return <span className="text-success-ink">✓</span>;
  if (value === "own") return <span className="text-[13px] text-ink-2">Propios</span>;
  return <span className="text-muted">—</span>;
}

/** Misma matriz que la pestaña "Roles y permisos" de Ent-Equipo.dc.html, construida desde src/lib/permissions.ts. */
export function PermissionsTable() {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Roles y permisos</h2>
        <p className="text-sm text-ink-2">Qué puede hacer cada rol en este negocio.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[14px]">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2.5 text-left text-[13px] font-medium text-muted">Permiso</th>
              {ROLES_IN_ORDER.map((r) => (
                <th key={r} className="pb-2.5 text-center text-[13px] font-medium text-muted">
                  {ROLE_LABEL[r]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissionMatrix().map((row) => (
              <tr key={row.permission} className="border-b border-divider last:border-0">
                <td className="py-3 text-left">{row.label}</td>
                {row.values.map((v, i) => (
                  <td key={ROLES_IN_ORDER[i]} className="py-3 text-center">
                    <Cell value={v} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
