import type { ReactNode } from "react";

/** DESIGN.md §6: contenedor con título H2 y acción opcional a la derecha (enlace 13px). */
export function Panel({
  title,
  action,
  children,
  className = "",
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card flex flex-col gap-4 p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[16px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
