import type { ComponentType, ReactNode } from "react";

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
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-display text-[30px] leading-tight md:text-[34px]">{title}</h1>
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
