"use client";

import { usePathname } from "next/navigation";
import { IconBell } from "@/components/icons";

type LocationOpt = { id: string; name: string };

const LABELS: Record<string, string> = {
  "/inicio": "Inicio",
  "/insumos": "Insumos",
  "/recetario": "Recetario y costeo",
  "/pedidos": "Pedidos",
  "/clientes": "Clientes",
  "/caja": "Caja",
  "/analitica": "Analítica",
  "/configuracion": "Configuración",
};

function currentLabel(path: string, recipeLabel: string) {
  if (path.startsWith("/recetario")) return path === "/recetario" ? recipeLabel : "Detalle";
  const base = "/" + (path.split("/")[1] ?? "");
  return LABELS[base] ?? "";
}

/** DESIGN.md §6: migas de pan 13px a la izquierda; botones 38px con ícono 15px a la derecha. */
export function TopBar({
  businessName,
  recipeLabel,
  locations,
  activeLocationId,
  onSetLocation,
}: {
  businessName: string;
  recipeLabel: string;
  locations: LocationOpt[];
  activeLocationId: string | null;
  onSetLocation: (formData: FormData) => void;
}) {
  const path = usePathname();
  const label = currentLabel(path, recipeLabel);

  return (
    <div className="hidden min-h-12 items-center justify-between border-b border-border px-8 pt-5 md:flex">
      <nav aria-label="Ubicación" className="flex items-center gap-1.5 text-[13px] text-muted">
        <span>{businessName}</span>
        {label && (
          <>
            <span aria-hidden="true">/</span>
            <span className="font-medium text-ink-2">{label}</span>
          </>
        )}
      </nav>
      <div className="flex items-center gap-2 pb-3">
        {locations.length > 0 && (
          <form action={onSetLocation}>
            <select
              key={activeLocationId ?? "todas"}
              name="location_id"
              defaultValue={activeLocationId ?? ""}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              aria-label="Sede"
              className="min-h-9 rounded-lg border border-border-strong bg-surface px-2.5 text-[13px]"
            >
              <option value="">Todas las sedes</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </form>
        )}
        <button type="button" aria-label="Notificaciones" className="icon-btn size-[38px] border border-border-strong bg-surface">
          <IconBell size={15} />
        </button>
      </div>
    </div>
  );
}
