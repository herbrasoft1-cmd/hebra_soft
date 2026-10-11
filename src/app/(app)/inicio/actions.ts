"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/tenant";

/** Tilda/destilda un paso del patrón para este pedido ("Mi turno"). */
export async function toggleOrderStep(orderId: string, stepId: string): Promise<boolean> {
  const { supabase } = await getSession();
  const { data, error } = await supabase.rpc("toggle_order_step", { p_order_id: orderId, p_step_id: stepId });
  if (error) throw new Error(error.message);
  revalidatePath("/inicio");
  return data as boolean;
}

/** Sube la foto de avance del pedido (se sobrescribe cada vez, no es una galería). */
export async function uploadProgressPhoto(orderId: string, formData: FormData): Promise<{ error?: string }> {
  const { supabase, tenant } = await getSession();
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0) return { error: "Elige una foto." };
  if (file.size > 3_000_000) return { error: "La foto debe pesar menos de 3 MB." };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { error: "Usa PNG, JPG o WEBP." };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${tenant.id}/${orderId}.${ext}`;
  const { error } = await supabase.storage.from("avance").upload(path, file, { upsert: true, contentType: file.type });
  if (error) return { error: "No se pudo subir la foto." };

  const { data } = supabase.storage.from("avance").getPublicUrl(path);
  const { error: updateError } = await supabase
    .from("orders")
    .update({ progress_photo_url: `${data.publicUrl}?v=${Date.now()}` })
    .eq("id", orderId)
    .eq("tenant_id", tenant.id);
  if (updateError) return { error: "La foto se subió pero no se pudo guardar. Intenta de nuevo." };
  revalidatePath("/inicio");
  revalidatePath("/pedidos");
  return {};
}
