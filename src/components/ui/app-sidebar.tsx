"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { AccountMenu } from "@/components/account-menu";
import {
  IconAgujas,
  IconCaja,
  IconChart,
  IconClientes,
  IconHebra,
  IconHelp,
  IconInicio,
  IconOvillo,
  IconRecetario,
  IconWallet,
  Logo,
} from "@/components/icons";
import { MiniTimer } from "@/components/timer";
import { canFully } from "@/lib/permissions";
import { ROLE_LABEL } from "@/lib/roles";
import type { Role } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Tooltip } from "@/components/ui/tooltip";

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
    { href: "/finanzas", label: "Finanzas", icon: IconWallet, group: "NEGOCIO", adminOnly: true },
    { href: "/analitica", label: "Analítica", icon: IconChart, group: "NEGOCIO", adminOnly: true },
    { href: "/configuracion", label: "Configuración", icon: IconAgujas, group: "NEGOCIO", adminOnly: true },
    { href: "/ayuda", label: "Ayuda", icon: IconHelp, group: "NEGOCIO" },
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
  userId,
  userName,
  userAvatarUrl,
  activeOrders,
}: {
  businessName: string;
  industryLabel: string;
  recipeLabel: string;
  role: Role;
  userId: string;
  userName: string;
  userAvatarUrl?: string | null;
  activeOrders: number;
}) {
  const path = usePathname();
  const items = useItems(recipeLabel, role, activeOrders);
  const groups = ["OPERACIÓN", "NEGOCIO"] as const;

  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] shrink-0 flex-col gap-4 bg-sidebar-bg px-3.5 py-4 md:flex">
      <Link
        href="/inicio"
        className="flex items-center gap-3 rounded-[14px] border border-sidebar-border bg-sidebar-raised p-2 text-left transition-colors hover:bg-sidebar-active"
      >
        <span className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-surface">
          <Logo size={24} />
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
            <div className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wide text-sidebar-label uppercase">{group}</div>
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
                    className={`relative flex min-h-9 items-center gap-3 rounded-[10px] px-3 text-[14px] transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/40 ${
                      active ? "bg-sidebar-active font-semibold text-sidebar-text-active" : "text-sidebar-text-2 hover:bg-sidebar-active/60"
                    }`}
                  >
                    {active && <span aria-hidden="true" className="absolute top-1.5 bottom-1.5 left-0 w-[3px] rounded-full bg-sidebar-icon-active" />}
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

      <div className="mt-auto flex flex-col gap-2.5">
        <MiniTimer />
        <Tooltip label="Editar perfil, ayuda y cerrar sesión" side="top" full>
          <AccountMenu userId={userId} userName={userName} roleLabel={ROLE_LABEL[role]} avatarUrl={userAvatarUrl}>
            <div className="flex w-full items-center gap-2.5 rounded-[10px] border-t border-sidebar-border px-1.5 pt-2.5 pb-0.5 transition-colors hover:bg-sidebar-active/60">
              <Avatar id={userId} name={userName} avatarUrl={userAvatarUrl} size={32} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-[13px] font-medium text-sidebar-text">{userName}</span>
                <span className="truncate text-[12px] text-sidebar-muted">{ROLE_LABEL[role]}</span>
              </span>
            </div>
          </AccountMenu>
        </Tooltip>
      </div>
    </aside>
  );
}
