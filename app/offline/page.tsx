import type { Metadata } from "next"

import { PageBackLink } from "@/components/nav/page-back-link"

export const metadata: Metadata = {
  title: "Offline",
  robots: { index: false, follow: false },
}

export default function OfflinePage() {
  return (
    <article className="min-w-0 pb-8 md:pb-24">
      <PageBackLink className="mb-7" />
      <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
        You&apos;re offline
      </h1>
      <p className="mt-8 max-w-md text-base leading-8 text-muted-foreground md:mt-7 md:text-lg md:leading-9">
        This page has not been saved on this device yet. Reconnect and try
        again.
      </p>
    </article>
  )
}
