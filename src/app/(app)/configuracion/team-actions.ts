"use server";

import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/audit";
import { getSession } from "@/lib/tenant";
import type { Invitation, Role } from "@/lib/types";

export type InviteState = { error?: string; invitation?: Invitation };

export async function createInvitation(_: InviteState, formData: FormData): Promise<InviteState> {
  const { supabase, tenant } = await getSession();
  const email = String(formData.get("email") ?? "").trim();
  const role = String(formData.get("role") ?? "tejedora") as Role;
  const locationId = String(formData.get("location_id") ?? "") || null;
  if (!email) return { error: "Escribe un correo." };

  const { data, error } = await supabase.rpc("create_invitation", {
    p_tenant_id: tenant.id,
    p_email: email,
    p_role: role,
    p_location_id: locationId,
  });
  if (error) return { error: error.message };
  await logAudit(supabase, { tenantId: tenant.id, action: "invite_member", entityType: "invitation", metadata: { email, role } });
  revalidatePath("/configuracion");
  return { invitation: data as Invitation };
}

export async function cancelInvitation(formData: FormData) {
  const { supabase } = await getSession();
  const { error } = await supabase.from("invitations").delete().eq("id", String(formData.get("id")));
  if (error) throw new Error("No se pudo cancelar la invitación.");
  revalidatePath("/configuracion");
}

export async function updateMemberRole(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const userId = String(formData.get("user_id"));
  const role = String(formData.get("role")) as Role;
  const { error } = await supabase.rpc("update_member_role", {
    p_tenant_id: tenant.id,
    p_user_id: userId,
    p_role: role,
  });
  if (error) throw new Error(error.message);
  await logAudit(supabase, { tenantId: tenant.id, action: "update_member_role", entityType: "member", entityId: userId, metadata: { role } });
  revalidatePath("/configuracion");
}

export async function removeMember(formData: FormData) {
  const { supabase, tenant } = await getSession();
  const userId = String(formData.get("user_id"));
  const { error } = await supabase.rpc("remove_member", { p_tenant_id: tenant.id, p_user_id: userId });
  if (error) throw new Error(error.message);
  await logAudit(supabase, { tenantId: tenant.id, action: "remove_member", entityType: "member", entityId: userId });
  revalidatePath("/configuracion");
}
