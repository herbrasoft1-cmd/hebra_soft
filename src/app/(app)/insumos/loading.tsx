import { Skeleton, SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-5">
      <SkeletonHeader />
      <div className="flex flex-wrap items-end gap-3">
        <Skeleton className="h-12 min-w-56 flex-1" />
        <Skeleton className="h-12 w-40" />
      </div>
      <Skeleton className="h-20 rounded-[18px]" />
      <div className="grid gap-2.5 md:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
