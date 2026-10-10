import { Skeleton, SkeletonCard, SkeletonHeader } from "@/components/skeleton";

/** Resguardo genérico: cualquier ruta sin su propio loading.tsx cae aquí. */
export default function Loading() {
  return (
    <>
      <SkeletonHeader />
      <Skeleton className="mb-6 h-11 w-full max-w-md" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </>
  );
}
