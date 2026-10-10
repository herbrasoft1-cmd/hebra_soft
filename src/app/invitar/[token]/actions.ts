"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error?: string };

export async function acceptInvitation(_: AcceptState, formData: FormData): Promise<AcceptState> {
  const supabase = await createClient();
  const token = String(formData.get("token") ?? "");
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) return { error: error.message };
  redirect("/inicio");
}
