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

/** Mismo patrón que uploadLogo (Configuración), pero la carpeta raíz es el propio user_id, no un
 * tenant — la foto es de la persona, no del negocio, y la ve cualquiera que vea su Avatar. */
export async function uploadAvatar(formData: FormData): Promise<{ error?: string }> {
  const { supabase, user } = await getSession();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una imagen." };
  if (file.size > 1_500_000) return { error: "La imagen debe pesar menos de 1,5 MB." };
  if (!["image/png", "image/jpeg"].includes(file.type)) return { error: "Usa PNG o JPG." };

  const path = `${user.id}/avatar.${file.type === "image/png" ? "png" : "jpg"}`;
  const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (uploadError) return { error: "No se pudo subir la foto." };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${data.publicUrl}?v=${Date.now()}`;
  const { error: updateError } = await supabase.auth.updateUser({ data: { avatar_url: avatarUrl } });
  if (updateError) return { error: "La foto se subió pero no se pudo guardar. Intenta de nuevo." };

  revalidatePath("/", "layout");
  return {};
}
