"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  IconAgujas,
  IconCaja,
  IconChart,
  IconClientes,
  IconHebra,
  IconInicio,
  IconOvillo,
  IconPlay,
  IconPlus,
  IconRecetario,
} from "@/components/icons";
import type { Role } from "@/lib/types";

type Item = { label: string; hint?: string; href: string; icon: ComponentType<{ size?: number }> };

function useItems(recipeLabel: string, role: Role): Item[] {
  const screens: Item[] = [
    { label: "Inicio", href: "/inicio", icon: IconInicio },
    { label: "Insumos", href: "/insumos", icon: IconOvillo },
    { label: recipeLabel, href: "/recetario", icon: IconRecetario },
    { label: "Pedidos", href: "/pedidos", icon: IconHebra },
    { label: "Clientes", href: "/clientes", icon: IconClientes },
  ];
  if (role !== "staff") {
    screens.push(
      { label: "Caja", href: "/caja", icon: IconCaja },
      { label: "Analítica", href: "/analitica", icon: IconChart },
      { label: "Configuración", href: "/configuracion", icon: IconAgujas },
    );
  }
  const actions: Item[] = [
    { label: "Registrar venta", hint: "Acción rápida", href: "/inicio?accion=venta", icon: IconPlus },
    { label: "Nuevo pedido", hint: "Acción rápida", href: "/pedidos", icon: IconPlus },
    { label: "Iniciar cronómetro", hint: "Acción rápida", href: "/recetario", icon: IconPlay },
  ];
  return [...screens, ...actions];
}

/** DESIGN.md §6: buscador "⌘K". Lista estática filtrada en el cliente, sin backend. */
export function CommandPalette({ recipeLabel, role }: { recipeLabel: string; role: Role }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const items = useItems(recipeLabel, role);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("hebra:command-palette", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("hebra:command-palette", onCustom);
    };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      d.showModal();
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 0);
    }
    if (!open && d.open) d.close();
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.label.toLowerCase().includes(q));
  }, [items, query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  return (
    <dialog
      ref={ref}
      onClose={() => setOpen(false)}
      onClick={(e) => {
        if (e.target === ref.current) setOpen(false);
      }}
      aria-label="Buscar o ejecutar"
      className="m-0 mt-20 w-full max-w-lg rounded-2xl border border-border bg-surface p-0 text-ink md:mx-auto"
    >
      <div className="flex flex-col">
        <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-muted" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M20 20l-4.2-4.2" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar pantalla o acción…"
            className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted"
          />
          <kbd className="font-mono rounded-md border border-border-strong px-1.5 py-0.5 text-[11px] text-muted">Esc</kbd>
        </div>
        <ul className="flex max-h-80 flex-col gap-0.5 overflow-y-auto p-2">
          {filtered.length === 0 && <li className="px-3 py-6 text-center text-sm text-muted">Sin resultados.</li>}
          {filtered.map((it) => {
            const Icon = it.icon;
            return (
              <li key={it.label}>
                <button
                  type="button"
                  onClick={() => go(it.href)}
                  className="flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-[14px] hover:bg-surface-muted"
                >
                  <Icon size={16} />
                  <span className="flex-1">{it.label}</span>
                  {it.hint && <span className="text-[12px] text-muted">{it.hint}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </dialog>
  );
}
