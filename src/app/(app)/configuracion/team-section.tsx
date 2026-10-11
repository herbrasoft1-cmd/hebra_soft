import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL } from "@/lib/roles";
import type { Invitation, Location, Membership, Role } from "@/lib/types";
import { InviteSheet } from "./invite-sheet";
import { MemberRow } from "./member-row";
import { cancelInvitation } from "./team-actions";

export function TeamSection({
  members,
  invitations,
  viewerRole,
  viewerId,
  locations,
}: {
  members: Membership[];
  invitations: Invitation[];
  viewerRole: Role;
  viewerId: string;
  locations: Location[];
}) {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Equipo</h2>
          <p className="text-sm text-ink-2">Quién tiene acceso a este negocio y con qué rol.</p>
        </div>
        {viewerRole === "owner" && <InviteSheet locations={locations} />}
      </div>

      <ul className="card flex flex-col overflow-hidden">
        {members.map((m) => (
          <MemberRow key={m.user_id} member={m} viewerRole={viewerRole} viewerId={viewerId} />
        ))}
      </ul>

      {invitations.length > 0 && (
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold text-ink-2">Invitaciones pendientes</h3>
          <ul className="card flex flex-col overflow-hidden">
            {invitations.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{inv.email}</span>
                  <span className="text-xs text-muted">{ROLE_LABEL[inv.role]} · pendiente</span>
                </span>
                <form action={cancelInvitation}>
                  <input type="hidden" name="id" value={inv.id} />
                  <SubmitButton className="btn min-h-9 px-3 text-xs text-muted" pendingText="…">
                    Cancelar
                  </SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
