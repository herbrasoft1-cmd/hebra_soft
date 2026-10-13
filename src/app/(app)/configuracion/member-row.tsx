"use client";

import { IconTrash } from "@/components/icons";
import { relativeTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/roles";
import type { Membership, Role } from "@/lib/types";
import { removeMember, updateMemberRole } from "./team-actions";

export function MemberRow({
  member,
  viewerRole,
  viewerId,
}: {
  member: Membership;
  viewerRole: Role;
  viewerId: string;
}) {
  const isSelf = member.user_id === viewerId;
  // Solo la Propietaria gestiona equipo (matriz de roles de Ent-Equipo.dc.html).
  const canManage = viewerRole === "owner";
  const canEditRole = canManage && member.role !== "owner" && !isSelf;
  const canRemove = isSelf ? true : canManage && member.role !== "owner";
  const roleOptions: Role[] = ["admin", "ventas", "tejedora"];

  return (
    <li className="flex items-center gap-3 border-b border-border px-4 py-3.5 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">
          {member.email}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-muted">(tú)</span>}
        </span>
        <span className="text-xs text-muted">
          {member.location_name ?? "Todas"} · desde {new Date(member.joined_at).toLocaleDateString("es-CO")} ·{" "}
          {relativeTime(member.last_sign_in_at)}
        </span>
      </span>

      <span className={`chip text-xs ${member.two_factor_enabled ? "bg-success-soft text-success-ink" : "bg-surface-muted text-muted"}`}>
        2FA {member.two_factor_enabled ? "activo" : "pendiente"}
      </span>

      {canEditRole ? (
        <form
          action={(fd) => {
            fd.set("user_id", member.user_id);
            return updateMemberRole(fd);
          }}
        >
          <select
            name="role"
            defaultValue={member.role}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            className="rounded-lg border border-border-strong bg-surface px-2.5 py-1.5 text-sm"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </form>
      ) : (
        <span className="chip bg-surface-muted text-ink-2">{ROLE_LABEL[member.role]}</span>
      )}

      {canRemove && (
        <form
          action={(fd) => {
            fd.set("user_id", member.user_id);
            return removeMember(fd);
          }}
          onSubmit={(e) => {
            const msg = isSelf ? "¿Salir de este negocio?" : "¿Quitar a esta persona del equipo?";
            if (!confirm(msg)) e.preventDefault();
          }}
        >
          <button type="submit" aria-label={isSelf ? "Salir del negocio" : "Quitar"} className="icon-btn size-9">
            <IconTrash size={16} />
          </button>
        </form>
      )}
    </li>
  );
}
