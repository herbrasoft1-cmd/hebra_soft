"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ComponentType } from "react";
import { canFully } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { IconAgujas, IconCaja, IconChart, IconClientes, IconDots, IconHebra, IconHelp, IconInicio, IconOvillo, IconRecetario, IconWallet } from "./icons";
import { Sheet } from "./sheet";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  adminOnly?: boolean;
};

/** Siempre visibles en la barra inferior: lo que se usa a diario, cualquiera sea el rol. */
function coreItems(recipeLabel: string): Item[] {
  return [
    { href: "/inicio", label: "Inicio", icon: IconInicio },
    { href: "/insumos", label: "Insumos", icon: IconOvillo },
    { href: "/recetario", label: recipeLabel, icon: IconRecetario },
    { href: "/pedidos", label: "Pedidos", icon: IconHebra },
  ];
}

/** El resto (Clientes, Caja, Finanzas, Analítica, Configuración, Ayuda) vive detrás de "Más" —
 * en celular no hay sidebar, así que sin esto quedaban inalcanzables para cualquier rol. */
function moreItems(role: Role): Item[] {
  const items: Item[] = [
    { href: "/clientes", label: "Clientes", icon: IconClientes },
    { href: "/caja", label: "Caja", icon: IconCaja, adminOnly: true },
    { href: "/finanzas", label: "Finanzas", icon: IconWallet, adminOnly: true },
    { href: "/analitica", label: "Analítica", icon: IconChart, adminOnly: true },
    { href: "/configuracion", label: "Configuración", icon: IconAgujas, adminOnly: true },
    { href: "/ayuda", label: "Ayuda", icon: IconHelp },
  ];
  return items.filter((it) => !it.adminOnly || canFully(role, "view_finance"));
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Barra inferior (celular) — el menú lateral de escritorio es AppSidebar (components/ui). */
export function BottomNav({ recipeLabel, role }: { recipeLabel: string; role: Role }) {
  const path = usePathname();
  const [showMore, setShowMore] = useState(false);
  const core = coreItems(recipeLabel);
  const more = moreItems(role);
  const moreActive = more.some((it) => isActive(path, it.href));

  return (
    <>
      <nav
        aria-label="Principal"
        style={{ gridTemplateColumns: `repeat(${core.length + 1}, 1fr)` }}
        className="pb-safe fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/90 px-1.5 pt-1.5 backdrop-blur-lg md:hidden"
      >
        {core.map((it) => {
          const active = isActive(path, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none ${
                active ? "text-primary-hover" : "text-muted"
              }`}
            >
              <span className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${active ? "bg-primary-soft" : ""}`}>
                <Icon size={21} />
              </span>
              <span className={active ? "font-semibold" : ""}>{it.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          aria-label="Más opciones"
          className={`flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none ${
            moreActive ? "text-primary-hover" : "text-muted"
          }`}
        >
          <span className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${moreActive ? "bg-primary-soft" : ""}`}>
            <IconDots size={21} />
          </span>
          <span className={moreActive ? "font-semibold" : ""}>Más</span>
        </button>
      </nav>

      <Sheet open={showMore} onClose={() => setShowMore(false)} title="Más opciones">
        <div className="flex flex-col gap-1">
          {more.map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setShowMore(false)}
                className="flex min-h-13 items-center gap-3.5 rounded-xl px-2 text-[15px] font-medium transition-colors hover:bg-surface-muted"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
                  <Icon size={18} />
                </span>
                {it.label}
              </Link>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
