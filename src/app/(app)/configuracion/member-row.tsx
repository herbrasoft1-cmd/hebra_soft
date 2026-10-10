"use client";

import { IconTrash } from "@/components/icons";
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
  const canManage = viewerRole === "owner" || viewerRole === "admin";
  const canTouchTarget = member.role !== "owner" || viewerRole === "owner";
  const roleOptions: Role[] = viewerRole === "owner" ? ["owner", "admin", "staff"] : ["admin", "staff"];
  const canEditRole = canManage && canTouchTarget && !isSelf;
  const canRemove = isSelf ? true : canManage && canTouchTarget;

  return (
    <li className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] font-medium">
          {member.email}
          {isSelf && <span className="ml-1.5 text-xs font-normal text-muted">(tú)</span>}
        </span>
        <span className="text-xs text-muted">Desde {new Date(member.joined_at).toLocaleDateString("es-CO")}</span>
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
            className="rounded-lg border border-line-strong bg-surface px-2.5 py-1.5 text-sm"
          >
            {roleOptions.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </form>
      ) : (
        <span className="chip bg-surface-2 text-ink-2">{ROLE_LABEL[member.role]}</span>
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
