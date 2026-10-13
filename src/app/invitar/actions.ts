"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CodeState = { error?: string };

export async function lookupInviteCode(_: CodeState, formData: FormData): Promise<CodeState> {
  const code = String(formData.get("code") ?? "").trim();
  if (!code) return { error: "Escribe el código que te compartieron." };

  const supabase = await createClient();
  const { data: token, error } = await supabase.rpc("get_invitation_by_code", { p_code: code });
  if (error || !token) return { error: "Ese código no es válido o ya venció. Pídele a quien te invitó uno nuevo." };

  redirect(`/invitar/${token}`);
}
