import Link from "next/link"
import { PiCaretLeftBold } from "react-icons/pi"

import { cn } from "@/lib/utils"

export function PageBackLink({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <PiCaretLeftBold aria-hidden="true" />
      <span>Back</span>
    </Link>
  )
}
