import { Skeleton } from "@/components/ui/skeleton"

export function KeepsSkeleton() {
  return (
    <article
      aria-label="Loading Keeps"
      aria-busy="true"
      className="w-full min-w-0 pb-8 md:pb-24"
    >
      <header className="flex flex-col gap-3 pb-8">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-5 w-full max-w-sm" />
        <Skeleton className="mt-2 h-9 w-full" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-12 rounded-full" />
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </header>

      <div className="min-w-0">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            className="border-b border-border px-3 py-8 last:border-0 md:px-4 md:py-10"
          >
            <div className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 xs:grid-cols-[7rem_minmax(0,1fr)] md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
              <Skeleton className="aspect-[4/5] w-full rounded-md" />
              <div className="min-w-0">
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-6 w-4/5" />
                </div>
                <div className="mt-3 flex flex-col gap-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
