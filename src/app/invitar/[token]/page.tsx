import Link from "next/link";
import { redirect } from "next/navigation";
import { ROLE_LABEL } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import { Shell } from "../shell";
import { AcceptForm } from "./accept-form";

export const metadata = { title: "Invitación" };

type InvitationRow = {
  role: Role;
  expires_at: string;
  accepted_at: string | null;
  tenants: { name: string } | null;
};

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/login?next=${encodeURIComponent(`/invitar/${token}`)}`);

  const { data } = await supabase
    .from("invitations")
    .select("role, expires_at, accepted_at, tenants(name)")
    .eq("token", token)
    .maybeSingle();
  const invitation = data as unknown as InvitationRow | null;

  if (!invitation) {
    return (
      <Shell
        title="Invitación no encontrada"
        text="Este enlace no existe o ya no es válido. Pídele a quien te invitó que te envíe uno nuevo."
      />
    );
  }
  if (invitation.accepted_at) {
    return (
      <Shell title="Ya te uniste" text="Esta invitación ya fue usada." action={<Link href="/inicio" className="btn-primary w-full">Ir a HEBRA</Link>} />
    );
  }
  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <Shell
        title="Invitación vencida"
        text="Este enlace venció. Pídele a quien te invitó que te envíe uno nuevo."
      />
    );
  }

  const businessName = invitation.tenants?.name ?? "este negocio";
  return (
    <Shell
      title="Te invitaron"
      text={`Únete a ${businessName} como ${ROLE_LABEL[invitation.role].toLowerCase()}.`}
      action={<AcceptForm token={token} />}
    />
  );
}
