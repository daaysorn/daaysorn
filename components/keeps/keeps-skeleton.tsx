import { BentoGrid } from "@/components/ui/bento-grid"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

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

      <BentoGrid className="min-w-0 auto-rows-auto grid-cols-1 md:grid-cols-2">
        {[0, 1, 2, 3].map((item) => (
          <Card
            key={item}
            className={cn(
              "min-h-64",
              (item === 0 || item === 3) && "md:col-span-2"
            )}
          >
            <CardHeader>
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="mt-5 h-7 w-4/5" />
              <Skeleton className="h-3 w-24" />
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </CardContent>
          </Card>
        ))}
      </BentoGrid>
    </article>
  )
}
