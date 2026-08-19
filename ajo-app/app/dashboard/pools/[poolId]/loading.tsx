import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-10">
      <div>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-9 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-3">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-32" />
        </div>
      </div>

      <div>
        <Skeleton className="mb-3 h-6 w-32" />
        <div className="space-y-2 rounded-lg border border-border bg-card p-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
