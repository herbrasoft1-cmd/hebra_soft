import { LogoutButton } from "@/components/logout-button";
import { PageHeader } from "@/components/page-header";
import { SubmitButton } from "@/components/submit-button";
import { ThemeToggle } from "@/components/theme";
import { getSession } from "@/lib/tenant";
import { INDUSTRY_OPTIONS } from "@/modules";
import { updateTenant } from "./actions";
import { LogoUpload } from "./logo-upload";

export const metadata = { title: "Configuración" };

export default async function SettingsPage() {
  const { tenant, user } = await getSession();

  return (
    <>
      <PageHeader title="Configuración" subtitle={user.email ?? undefined} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form action={updateTenant} className="card flex flex-col gap-4 p-5">
          <h2 className="font-display text-xl font-semibold">Tu negocio</h2>
          <label className="field">
            Nombre del negocio
            <input className="input" name="name" defaultValue={tenant.name} required />
          </label>
          <label className="field">
            Tipo de negocio
            <select className="input" name="industry" defaultValue={tenant.industry}>
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              Valor de tu hora (COP)
              <input className="input" name="hourly_rate" type="number" min="0" step="500" defaultValue={tenant.hourly_rate} />
            </label>
            <label className="field">
              Desgaste de herramientas (%)
              <input className="input" name="tool_wear_pct" type="number" min="0" max="100" step="0.5" defaultValue={tenant.tool_wear_pct} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="field">
              WhatsApp del negocio
              <input className="input" name="whatsapp" inputMode="tel" defaultValue={tenant.whatsapp ?? ""} />
            </label>
            <label className="field">
              Instagram
              <input className="input" name="instagram" placeholder="@" defaultValue={tenant.instagram ?? ""} />
            </label>
          </div>
          <SubmitButton>Guardar</SubmitButton>
        </form>

        <div className="flex flex-col gap-6">
          <LogoUpload logoUrl={tenant.logo_url} />
          <section className="card flex flex-col gap-3 p-5">
            <h2 className="font-display text-xl font-semibold">Apariencia</h2>
            <p className="text-sm text-ink-2">El modo nocturno usa tonos café y sepia para tejer de noche sin cansar la vista.</p>
            <ThemeToggle />
          </section>
          <LogoutButton />
        </div>
      </div>
    </>
  );
}
