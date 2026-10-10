import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tenant } from "@/lib/types";

/**
 * Devuelve el usuario y su negocio actual (tenant).
 * Todas las consultas del app se filtran por tenant.id; además RLS lo impone en la base.
 * `cache` evita repetir la consulta dentro del mismo request.
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
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const tenant = (membership?.tenants ?? null) as unknown as Tenant | null;
  if (!tenant) redirect("/bienvenida");

  return { supabase, user, tenant };
});
