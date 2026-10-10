import { redirect } from "next/navigation";
import { Logo } from "@/components/icons";
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
    <main className="flex min-h-dvh items-center justify-center bg-surface-2 px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={48} />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl">Hola{meta.full_name ? `, ${meta.full_name.split(" ")[0]}` : ""}</h1>
            <p className="text-ink-2">Último paso: confirma los datos de tu negocio.</p>
          </div>
        </div>
        <div className="card p-7 shadow-md">
          <BusinessForm defaultName={meta.business_name ?? ""} defaultIndustry={meta.industry ?? "crochet"} />
        </div>
      </div>
    </main>
  );
}
