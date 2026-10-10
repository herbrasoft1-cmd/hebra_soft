import { Skeleton, SkeletonHeader, SkeletonRow, SkeletonStat } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="mb-7 grid grid-cols-3 gap-3">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-32" />
          <div className="card flex flex-col overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
        </div>
      </div>
    </>
  );
}
