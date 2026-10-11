import { Skeleton, SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <SkeletonHeader />
      <div className="hidden overflow-x-auto pb-2 md:block">
        <div className="grid min-w-[1000px] grid-cols-4 gap-4">
          {Array.from({ length: 4 }, (_, col) => (
            <div key={col} className="flex min-h-[560px] flex-col gap-3 rounded-2xl border border-border bg-surface-muted p-3.5">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 }, (_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
