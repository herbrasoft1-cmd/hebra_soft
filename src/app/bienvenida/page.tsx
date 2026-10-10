import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BusinessForm } from "./business-form";

export const metadata = { title: "Bienvenida" };

/** Onboarding: crea el negocio (tenant) de un usuario que confirmó su correo. */
export default async function WelcomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("tenant_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/inicio");

  const meta = user.user_metadata as { business_name?: string; industry?: string; full_name?: string };

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl">Hola{meta.full_name ? `, ${meta.full_name.split(" ")[0]}` : ""}</h1>
          <p className="mt-1 text-ink-2">Último paso: confirma los datos de tu negocio.</p>
        </div>
        <BusinessForm defaultName={meta.business_name ?? ""} defaultIndustry={meta.industry ?? "crochet"} />
      </div>
    </main>
  );
}
