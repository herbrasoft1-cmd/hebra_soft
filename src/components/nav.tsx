"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import type { Role } from "@/lib/types";
import {
  IconAgujas,
  IconCaja,
  IconChart,
  IconClientes,
  IconHebra,
  IconInicio,
  IconOvillo,
  IconRecetario,
  Logo,
} from "./icons";
import { MiniTimer } from "./timer";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  mobile: boolean;
  adminOnly?: boolean;
};

export function useNavItems(recipeLabel: string, role: Role): Item[] {
  const items: Item[] = [
    { href: "/inicio", label: "Inicio", icon: IconInicio, mobile: true },
    { href: "/insumos", label: "Insumos", icon: IconOvillo, mobile: true },
    { href: "/recetario", label: recipeLabel, icon: IconRecetario, mobile: true },
    { href: "/pedidos", label: "Pedidos", icon: IconHebra, mobile: true },
    { href: "/clientes", label: "Clientes", icon: IconClientes, mobile: false },
    { href: "/caja", label: "Caja", icon: IconCaja, mobile: true, adminOnly: true },
    { href: "/analitica", label: "Analítica", icon: IconChart, mobile: false, adminOnly: true },
    { href: "/configuracion", label: "Configuración", icon: IconAgujas, mobile: false, adminOnly: true },
  ];
  return items.filter((it) => !it.adminOnly || role !== "staff");
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Menú lateral (escritorio) */
export function Sidebar({
  businessName,
  recipeLabel,
  role,
}: {
  businessName: string;
  recipeLabel: string;
  role: Role;
}) {
  const path = usePathname();
  const items = useNavItems(recipeLabel, role);
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-7 border-r border-line bg-surface-2 px-4 py-6 md:flex">
      <Link href="/inicio" className="flex items-center gap-2.5 px-2">
        <Logo />
        <span className="font-display text-2xl font-semibold text-ink">hebra</span>
      </Link>
      <p className="truncate px-2 text-xs font-semibold tracking-wide text-muted uppercase">{businessName}</p>
      <nav className="flex flex-col gap-0.5" aria-label="Principal">
        {items.map((it) => {
          const active = isActive(path, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-all focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30 ${
                active
                  ? "bg-primary-soft font-semibold text-primary-ink shadow-xs"
                  : "text-ink-2 hover:bg-surface hover:text-ink"
              }`}
            >
              <Icon size={20} />
              {it.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto">
        <MiniTimer />
      </div>
    </aside>
  );
}

/** Barra inferior (celular) */
export function BottomNav({ recipeLabel, role }: { recipeLabel: string; role: Role }) {
  const path = usePathname();
  const items = useNavItems(recipeLabel, role).filter((i) => i.mobile);
  return (
    <nav
      aria-label="Principal"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 grid border-t border-line bg-surface/90 px-1.5 pt-1.5 shadow-[var(--c-shadow-up)] backdrop-blur-lg md:hidden"
    >
      {items.map((it) => {
        const active = isActive(path, it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-13 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors focus-visible:outline-none ${
              active ? "text-primary-ink" : "text-muted"
            }`}
          >
            <span
              className={`flex h-7 w-11 items-center justify-center rounded-full transition-colors ${
                active ? "bg-primary-soft" : ""
              }`}
            >
              <Icon size={21} />
            </span>
            <span className={active ? "font-semibold" : ""}>{it.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
