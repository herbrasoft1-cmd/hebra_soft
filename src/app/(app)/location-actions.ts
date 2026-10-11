"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCATION_COOKIE } from "@/lib/location";

/** Guarda la sede elegida en el selector global de la barra superior. */
export async function setActiveLocation(formData: FormData) {
  const id = String(formData.get("location_id") ?? "");
  const store = await cookies();
  if (id) {
    store.set(LOCATION_COOKIE, id, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  } else {
    store.delete(LOCATION_COOKIE);
  }
  revalidatePath("/", "layout");
}
