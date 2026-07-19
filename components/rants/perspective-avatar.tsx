import { cn } from "@/lib/utils"

export function PerspectiveAvatar({
  seed,
  className,
}: {
  seed: string
  className?: string
}) {
  const source = `https://api.dicebear.com/10.x/thumbs/svg?seed=${encodeURIComponent(seed || "daaysorn-reader")}`

  return (
    <span
      className={cn(
        "relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted bg-cover bg-center bg-no-repeat font-mono text-xs text-muted-foreground",
        className
      )}
      aria-hidden="true"
      style={{ backgroundImage: `url("${source}")` }}
    />
  )
}
