import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-4 w-56" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-lg border border-border bg-card p-5">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="mt-2 h-4 w-24" />
            <Skeleton className="mt-3 h-3 w-32" />
            <Skeleton className="mt-1 h-3 w-20" />
            <Skeleton className="mt-4 h-8 w-full rounded-md" />
          </div>
        ))}
      </div>

      <div>
        <Skeleton className="mb-3 h-6 w-40" />
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
