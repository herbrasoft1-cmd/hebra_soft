import { SubmitButton } from "@/components/submit-button";
import type { Location } from "@/lib/types";
import { createLocation } from "./actions";

export function LocationsSection({ locations }: { locations: Location[] }) {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Sedes</h2>
        <p className="text-sm text-ink-2">Dónde opera tu negocio. El selector de la barra superior filtra por sede.</p>
      </div>

      <ul className="card flex flex-col overflow-hidden">
        {locations.map((l) => (
          <li key={l.id} className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-0">
            <span className="truncate text-[15px] font-medium">{l.name}</span>
          </li>
        ))}
      </ul>

      <form action={createLocation} className="flex items-end gap-2">
        <label className="field flex-1">
          Nueva sede
          <input className="input" name="name" placeholder="Ej. Bogotá" required />
        </label>
        <SubmitButton className="btn-ghost" pendingText="Creando…">
          Agregar
        </SubmitButton>
      </form>
    </section>
  );
}
