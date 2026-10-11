import Link from "next/link";
import { IconBack } from "./icons";

/** Paginador simple: anterior/siguiente por número de página en la URL (?page=). */
export function Pager({ page, totalPages, basePath }: { page: number; totalPages: number; basePath: string }) {
  if (totalPages <= 1) return null;
  const href = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  return (
    <nav aria-label="Paginación" className="mt-4 flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={href(page - 1)} className="icon-btn size-9 border border-border-strong bg-surface">
          <IconBack size={16} />
        </Link>
      ) : (
        <span className="icon-btn size-9 border border-border-strong bg-surface opacity-40">
          <IconBack size={16} />
        </span>
      )}
      <span className="text-sm text-ink-2 tabular-nums">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={href(page + 1)} className="icon-btn size-9 border border-border-strong bg-surface">
          <IconBack size={16} className="rotate-180" />
        </Link>
      ) : (
        <span className="icon-btn size-9 border border-border-strong bg-surface opacity-40">
          <IconBack size={16} className="rotate-180" />
        </span>
      )}
    </nav>
  );
}
