import Link from "next/link"

import { PerspectiveForm } from "@/components/rants/perspective-form"
import type { Perspective, Rant } from "@/lib/rants/types"

function formatDate(value: string | null) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value ?? Date.now()))
}

function shouldShowExcerpt(rant: Rant) {
  const normalize = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
  const body = normalize(rant.bodyText)
  const excerpt = normalize(rant.excerpt)
  const bodyWords = body.split(/\s+/).filter(Boolean).length

  return (
    bodyWords > 80 &&
    excerpt.length > 0 &&
    excerpt !== body &&
    !body.startsWith(excerpt)
  )
}

export function RantArticle({
  rant,
  perspectives,
  preview = false,
}: {
  rant: Rant
  perspectives: Perspective[]
  preview?: boolean
}) {
  const showExcerpt = shouldShowExcerpt(rant)

  return (
    <article className="min-w-0 pb-10 md:pb-24">
      {preview ? (
        <p className="mb-5 border-y border-border py-2 font-mono text-xs text-muted-foreground">
          Private draft preview
        </p>
      ) : null}
      <Link
        href="/rants"
        className="text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        ← Rants
      </Link>
      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          <span>Rant</span>
          <span>{formatDate(rant.publishedAt ?? rant.createdAt)}</span>
          <span>{rant.readingMinutes} min</span>
        </div>
        <h1 className="mt-4 max-w-[15ch] text-3xl leading-tight font-semibold tracking-tight xs:text-4xl md:text-5xl">
          {rant.title}
        </h1>
        {showExcerpt ? (
          <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
            {rant.excerpt}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {rant.tags.map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
      </header>

      <div
        className="mt-10 max-w-2xl text-base leading-8 text-muted-foreground [&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline [&_blockquote]:my-7 [&_blockquote]:border-l-2 [&_blockquote]:border-primary [&_blockquote]:pl-5 [&_blockquote]:text-foreground [&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_pre]:my-6 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-semibold [&_strong]:text-foreground"
        dangerouslySetInnerHTML={{ __html: rant.bodyHtml }}
      />

      {!preview ? (
        <section className="mt-14 border-t border-border pt-7">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
                Perspectives · {perspectives.length.toString().padStart(2, "0")}
              </p>
              <h2 className="mt-2 text-xl font-semibold">Add to the thought</h2>
            </div>
          </div>

          {perspectives.length ? (
            <div className="mt-7 divide-y divide-border border-y border-border">
              {perspectives.map((perspective) => (
                <article key={perspective.id} className="py-5">
                  <p className="text-sm font-medium text-foreground">
                    {perspective.name}
                  </p>
                  <p className="mt-2 text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                    {perspective.body}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No Perspectives yet. You can be the first.
            </p>
          )}
          <PerspectiveForm rantId={rant.id} />
        </section>
      ) : null}
    </article>
  )
}
