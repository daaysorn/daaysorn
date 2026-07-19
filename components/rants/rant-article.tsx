import Link from "next/link"
import { PiCaretLeftBold } from "react-icons/pi"

import { PerspectiveList } from "@/components/rants/perspective-list"
import type { Perspective, Rant } from "@/lib/rants/types"

function formatDate(value: string | null) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value ?? Date.now()))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Africa/Lagos",
  }).format(new Date(value))
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
  const editedAfterPublishing = Boolean(
    rant.publishedAt &&
    new Date(rant.updatedAt).getTime() - new Date(rant.publishedAt).getTime() >
      1000
  )

  return (
    <article className="min-w-0 pb-10 md:pb-24">
      {preview ? (
        <p className="mb-5 border-y border-border py-2 font-mono text-xs text-muted-foreground">
          Private draft preview
        </p>
      ) : null}
      <Link
        href="/rants"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <PiCaretLeftBold aria-hidden="true" />
        <span>Rants</span>
      </Link>
      <header className="mt-8">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          <span>Rant</span>
          <span>
            {editedAfterPublishing
              ? `Last edited · ${formatDateTime(rant.updatedAt)}`
              : formatDate(rant.publishedAt ?? rant.createdAt)}
          </span>
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
        <section className="mt-14">
          <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
            Perspectives
          </p>

          <PerspectiveList
            key={perspectives
              .map((perspective) => `${perspective.id}:${perspective.body}`)
              .join("|")}
            rantId={rant.id}
            perspectives={perspectives}
          />
        </section>
      ) : null}
    </article>
  )
}
