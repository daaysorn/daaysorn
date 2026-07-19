import Link from "next/link"
import { PiCaretLeftBold } from "react-icons/pi"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <section className="pointer-events-none fixed inset-0 flex items-center justify-center px-6">
      <div className="pointer-events-auto max-w-sm min-w-0 text-center">
        <p className="font-mono text-sm font-medium text-primary">404</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          Page not found
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist
          <span className="block">or may have moved.</span>
        </p>
        <Button
          asChild
          variant="outline"
          size="lg"
          className="mt-7 h-11 rounded-full pr-4 pl-2 shadow-xs"
        >
          <Link href="/">
            <span className="flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform group-hover/button:-translate-x-0.5">
              <PiCaretLeftBold aria-hidden className="size-3.5" />
            </span>
            Back to home
          </Link>
        </Button>
      </div>
    </section>
  )
}
