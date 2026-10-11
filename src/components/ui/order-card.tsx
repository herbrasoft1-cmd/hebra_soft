import type { ReactNode } from "react";
import { Avatar } from "./avatar";
import { ProgressBar } from "./progress-bar";

/**
 * DESIGN.md §6: tarjeta con ID mono, chip de vencimiento, cliente·canal, barra de avance, horas,
 * avatar, precio. Lista para la Fase 3 (Producción); hoy sin datos reales.
 */
export function OrderCard({
  id,
  title,
  dueChip,
  meta,
  progress,
  hours,
  price,
  person,
}: {
  id: string;
  title: string;
  dueChip?: ReactNode;
  meta?: string;
  progress?: number;
  hours?: string;
  price?: string;
  person?: { id: string; name: string };
}) {
  return (
    <article className="card flex flex-col gap-2.5 p-3.5">
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[11px] text-muted">{id}</span>
        {dueChip}
      </div>
      <p className="text-[14px] font-medium">{title}</p>
      {meta && <p className="text-[12px] text-muted">{meta}</p>}
      {progress !== undefined && <ProgressBar value={progress} />}
      <div className="flex items-center justify-between gap-2">
        {hours && <span className="text-[12px] text-muted">{hours}</span>}
        <div className="ml-auto flex items-center gap-2">
          {person && <Avatar id={person.id} name={person.name} size={24} />}
          {price && <span className="text-[14px] font-semibold tabular-nums">{price}</span>}
        </div>
      </div>
    </article>
  );
}
