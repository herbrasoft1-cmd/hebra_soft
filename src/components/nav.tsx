"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { canFully } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { IconCaja, IconHebra, IconInicio, IconOvillo, IconRecetario } from "./icons";

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
    { href: "/caja", label: "Caja", icon: IconCaja, mobile: true, adminOnly: true },
  ];
  return items.filter((it) => !it.adminOnly || canFully(role, "view_finance"));
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Barra inferior (celular) — el menú lateral de escritorio es AppSidebar (components/ui). */
export function BottomNav({ recipeLabel, role }: { recipeLabel: string; role: Role }) {
  const path = usePathname();
  const items = useNavItems(recipeLabel, role).filter((i) => i.mobile);
  return (
    <nav
      aria-label="Principal"
      style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}
      className="pb-safe fixed inset-x-0 bottom-0 z-30 grid border-t border-border bg-surface/90 px-1.5 pt-1.5 backdrop-blur-lg md:hidden"
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
              active ? "text-primary-hover" : "text-muted"
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
