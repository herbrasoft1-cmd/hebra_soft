"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconAgujas,
  IconCaja,
  IconChart,
  IconClientes,
  IconHebra,
  IconInicio,
  IconOvillo,
  IconRecetario,
} from "@/components/icons";
import { MiniTimer } from "@/components/timer";
import { canFully } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/types";

type Item = {
  href: string;
  label: string;
  icon: ComponentType<{ size?: number }>;
  group: "OPERACIÓN" | "NEGOCIO";
  adminOnly?: boolean;
  badge?: number;
};

function useItems(recipeLabel: string, role: Role, activeOrders: number): Item[] {
  const items: Item[] = [
    { href: "/inicio", label: "Inicio", icon: IconInicio, group: "OPERACIÓN" },
    { href: "/insumos", label: "Insumos", icon: IconOvillo, group: "OPERACIÓN" },
    { href: "/recetario", label: recipeLabel, icon: IconRecetario, group: "OPERACIÓN" },
    { href: "/pedidos", label: "Pedidos", icon: IconHebra, group: "OPERACIÓN", badge: activeOrders || undefined },
    { href: "/clientes", label: "Clientes", icon: IconClientes, group: "NEGOCIO" },
    { href: "/caja", label: "Caja", icon: IconCaja, group: "NEGOCIO", adminOnly: true },
    { href: "/analitica", label: "Analítica", icon: IconChart, group: "NEGOCIO", adminOnly: true },
    { href: "/configuracion", label: "Configuración", icon: IconAgujas, group: "NEGOCIO", adminOnly: true },
  ];
  return items.filter((it) => !it.adminOnly || canFully(role, "view_finance"));
}

function isActive(path: string, href: string) {
  return path === href || path.startsWith(href + "/");
}

export function AppSidebar({
  businessName,
  industryLabel,
  recipeLabel,
  role,
  userName,
  activeOrders,
}: {
  businessName: string;
  industryLabel: string;
  recipeLabel: string;
  role: Role;
  userName: string;
  activeOrders: number;
}) {
  const path = usePathname();
  const items = useItems(recipeLabel, role, activeOrders);
  const groups = ["OPERACIÓN", "NEGOCIO"] as const;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-5 bg-sidebar-bg px-3.5 py-5 md:flex">
      <Link
        href="/inicio"
        className="flex items-center gap-3 rounded-[14px] border border-sidebar-border bg-sidebar-raised p-2 text-left transition-colors hover:bg-sidebar-active"
      >
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary text-white">
          <IconOvillo size={22} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[14px] font-semibold text-sidebar-text">{businessName}</span>
          <span className="truncate text-[12px] text-sidebar-muted">{industryLabel}</span>
        </span>
      </Link>

      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent("hebra:command-palette"))}
        className="flex min-h-10 items-center gap-2.5 rounded-[10px] border border-sidebar-border px-3 text-[13px] text-sidebar-muted transition-colors hover:text-sidebar-text-2"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" />
          <path d="M20 20l-4.2-4.2" />
        </svg>
        <span className="flex-1 text-left">Buscar o ejecutar…</span>
        <span className="font-mono rounded-md border border-sidebar-border px-1.5 py-0.5 text-[11px]">⌘K</span>
      </button>

      <nav aria-label="Principal" className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {groups.map((group) => (
          <div key={group} className="flex flex-col gap-0.5">
            <div className="px-3 pt-4 pb-1.5 text-[11px] font-semibold tracking-wide text-sidebar-label uppercase">{group}</div>
            {items
              .filter((it) => it.group === group)
              .map((it) => {
                const active = isActive(path, it.href);
                const Icon = it.icon;
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-10 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 ${
                      active ? "bg-sidebar-active font-semibold text-sidebar-text-active" : "text-sidebar-text-2 hover:bg-sidebar-active/60"
                    }`}
                  >
                    <Icon size={18} />
                    <span className="flex-1 truncate" style={active ? { color: "var(--color-sidebar-text-active)" } : undefined}>
                      {it.label}
                    </span>
                    {!!it.badge && (
                      <span className="rounded-full bg-primary px-[7px] py-px text-[11px] font-semibold text-white">{it.badge}</span>
                    )}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <MiniTimer />
        <div className="flex items-center gap-2.5 border-t border-sidebar-border px-1 pt-3">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-sidebar-raised text-[12px] font-semibold text-sidebar-text">
            {userName.slice(0, 2).toUpperCase()}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[13px] font-medium text-sidebar-text">{userName}</span>
            <span className="truncate text-[12px] text-sidebar-muted">{ROLE_LABEL[role]}</span>
          </span>
        </div>
      </div>
    </aside>
  );
}
