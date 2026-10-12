"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/tenant";

/** Cada quien edita su propio nombre para mostrar (Supabase Auth, no una tabla de negocio). */
export async function updateProfile(formData: FormData): Promise<{ error?: string }> {
  const { supabase } = await getSession();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { error: "Escribe tu nombre." };

  const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
  if (error) return { error: "No se pudo guardar el nombre." };

  revalidatePath("/", "layout");
  return {};
}
