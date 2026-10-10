"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconAgujas,
  IconCaja,
  IconClientes,
  IconHebra,
  IconInicio,
  IconOvillo,
  IconRecetario,
  Logo,
} from "./icons";
import { MiniTimer } from "./timer";

type Item = { href: string; label: string; icon: ComponentType<{ size?: number }>; mobile: boolean };

export function useNavItems(recipeLabel: string): Item[] {
  return [
    { href: "/inicio", label: "Inicio", icon: IconInicio, mobile: true },
    { href: "/insumos", label: "Insumos", icon: IconOvillo, mobile: true },
    { href: "/recetario", label: recipeLabel, icon: IconRecetario, mobile: true },
    { href: "/pedidos", label: "Pedidos", icon: IconHebra, mobile: true },
    { href: "/clientes", label: "Clientes", icon: IconClientes, mobile: false },
    { href: "/caja", label: "Caja", icon: IconCaja, mobile: true },
    { href: "/configuracion", label: "Configuración", icon: IconAgujas, mobile: false },
  ];
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

/** Menú lateral (escritorio) */
export function Sidebar({ businessName, recipeLabel }: { businessName: string; recipeLabel: string }) {
  const path = usePathname();
  const items = useNavItems(recipeLabel);
  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-line bg-surface-2 px-4 py-6 md:flex">
      <Link href="/inicio" className="flex items-center gap-2.5 px-2">
        <Logo />
        <span className="font-display text-[22px] font-semibold text-ink">hebra</span>
      </Link>
      <p className="truncate px-2 text-sm text-muted">{businessName}</p>
      <nav className="flex flex-col gap-1" aria-label="Principal">
        {items.map((it) => {
          const active = isActive(path, it.href);
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] transition ${
                active ? "bg-primary-soft font-semibold text-primary-ink" : "text-ink-2 hover:bg-surface"
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
export function BottomNav({ recipeLabel }: { recipeLabel: string }) {
  const path = usePathname();
  const items = useNavItems(recipeLabel).filter((i) => i.mobile);
  return (
    <nav
      aria-label="Principal"
      className="pb-safe fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-surface px-1.5 pt-1.5 md:hidden"
    >
      {items.map((it) => {
        const active = isActive(path, it.href);
        const Icon = it.icon;
        return (
          <Link
            key={it.href}
            href={it.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-13 flex-col items-center justify-center gap-0.5 text-[11px] ${
              active ? "font-semibold text-primary" : "text-muted"
            }`}
          >
            <Icon size={22} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
