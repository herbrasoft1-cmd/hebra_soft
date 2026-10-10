import { Skeleton, SkeletonHeader } from "@/components/skeleton";

export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-[420px] rounded-2xl" />
        <div className="flex flex-col gap-6">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-12 rounded-xl" />
        </div>
      </div>
    </>
  );
}
