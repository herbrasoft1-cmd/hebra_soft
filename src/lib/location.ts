import { cookies } from "next/headers";

/** Sede activa elegida en el selector de la barra superior. null = "Todas las sedes". */
export const LOCATION_COOKIE = "hebra_location";

export async function getActiveLocationId(): Promise<string | null> {
  const store = await cookies();
  return store.get(LOCATION_COOKIE)?.value || null;
}
