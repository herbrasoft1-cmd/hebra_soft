import Link from "next/link";
import type { ReactNode } from "react";

/**
 * DESIGN.md §6: fondo night, título 13px accent-light, texto 14px, botón accent-light con texto
 * ink. Lista para las Fases 2/3/5 (sugerencias); hoy sin datos reales.
 */
export function InsightCard({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: { label: string; href: string };
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-night p-4 text-on-night">
      <span className="text-[13px] font-semibold text-accent-light">{title}</span>
      <p className="text-[14px]">{children}</p>
      {action && (
        <Link href={action.href} className="btn bg-accent-light text-ink hover:brightness-95">
          {action.label}
        </Link>
      )}
    </div>
  );
}
