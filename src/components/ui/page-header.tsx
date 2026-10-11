import type { ComponentType, ReactNode } from "react";

/** DESIGN.md §3: H1 Fraunces 36px (30px móvil), subtítulo 15px ink-2, acciones a la derecha. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[30px] leading-tight md:text-[36px]">{title}</h1>
        {subtitle && <p className="text-[15px] text-ink-2">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({
  title,
  text,
  action,
  icon: Icon,
}: {
  title: string;
  text: string;
  action?: ReactNode;
  icon?: ComponentType<{ size?: number; className?: string }>;
}) {
  return (
    <div className="card flex flex-col items-center gap-4 px-6 py-14 text-center">
      {Icon && (
        <span className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary">
          <Icon size={26} />
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        <h2 className="font-display text-xl font-semibold">{title}</h2>
        <p className="max-w-sm text-[15px] text-ink-2">{text}</p>
      </div>
      {action}
    </div>
  );
}
