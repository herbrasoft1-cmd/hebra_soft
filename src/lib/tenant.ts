import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, Tenant } from "@/lib/types";

/**
 * Devuelve el usuario, su rol y su negocio actual (tenant).
 * Todas las consultas del app se filtran por tenant.id; además RLS lo impone en la base.
 * `cache` evita repetir la consulta dentro del mismo request.
 *
 * Si el usuario pertenece a varios negocios (ej. es dueño de uno y staff de otro), se usa
 * el más reciente al que se unió — así aceptar una invitación lo deja activo de inmediato.
 * No hay selector de negocio todavía: queda para cuando pertenecer a varios sea algo común.
 */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, tenants(*)")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const tenant = (membership?.tenants ?? null) as unknown as Tenant | null;
  if (!tenant) redirect("/bienvenida");
  const role = (membership?.role ?? "staff") as Role;

  return { supabase, user, tenant, role };
});
