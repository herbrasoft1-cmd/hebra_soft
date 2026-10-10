/** Bloque base: pulso suave, nunca layout-shift porque ocupa el tamaño final. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-surface-2 ${className}`} aria-hidden="true" />;
}

export function SkeletonHeader() {
  return (
    <div className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className="card flex flex-col gap-2.5 p-3.5 md:gap-3 md:p-5">
      <Skeleton className="size-8 rounded-full md:size-9" />
      <div className="flex flex-col gap-1.5">
        <Skeleton className="h-5 w-16 md:h-6" />
        <Skeleton className="h-3 w-20" />
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-3.5 last:border-0">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-14 rounded-full" />
    </div>
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="card flex flex-col gap-3 p-4">
      <Skeleton className="h-5 w-2/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5 w-full" />
      ))}
    </div>
  );
}
