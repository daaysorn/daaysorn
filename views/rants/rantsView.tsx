import Link from "next/link"

import { PageBackLink } from "@/components/nav/page-back-link"
import { listPublishedRants } from "@/lib/rants/db"

function archiveDate(value: string | null) {
  const date = new Date(value ?? Date.now())
  return {
    dayMonth: new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
    })
      .format(date)
      .toUpperCase(),
    year: date.getFullYear(),
  }
}

export default async function RantsView() {
  const rants = await listPublishedRants()
  return (
    <article className="min-w-0 pb-10 md:pb-24">
      <PageBackLink className="mb-7" />
      <header className="flex items-end justify-between gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
            Rants
          </h1>
          <p className="mt-3 text-sm text-muted-foreground xs:text-base md:mt-2">
            Thoughts, questions, and unfinished conclusions.
          </p>
        </div>
        {rants[0] ? (
          <span className="font-mono text-xs text-muted-foreground">
            {archiveDate(rants[0].publishedAt).year}
          </span>
        ) : null}
      </header>
      {rants.length ? (
        <div className="divide-y divide-border">
          {rants.map((rant) => {
            const date = archiveDate(rant.publishedAt)
            return (
              <Link
                key={rant.id}
                href={`/rants/${rant.slug}`}
                className="group grid min-w-0 grid-cols-[3.75rem_minmax(0,1fr)] gap-x-4 gap-y-1 py-5 no-underline md:grid-cols-[4.5rem_minmax(0,1fr)_auto] md:items-center"
              >
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {date.dayMonth}
                </span>
                <h2 className="min-w-0 text-base leading-6 font-semibold transition-colors group-hover:text-muted-foreground md:text-lg">
                  {rant.title}
                </h2>
                <span className="col-start-2 font-mono text-xs text-muted-foreground uppercase md:col-start-3 md:text-right">
                  {rant.tags[0] ?? "Thoughts"} · {rant.readingMinutes} min
                </span>
              </Link>
            )
          })}
        </div>
      ) : (
        <p className="mt-8 text-base text-muted-foreground">Nothing yet</p>
      )}
    </article>
  )
}
