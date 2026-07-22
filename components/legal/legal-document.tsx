import Link from "next/link"
import type { ReactNode } from "react"

import { PageBackLink } from "@/components/nav/page-back-link"
import { siteConfig } from "@/lib/seo"
import { cn } from "@/lib/utils"

export type LegalSection = {
  id: string
  title: string
  content: ReactNode
}

type LegalDocumentProps = {
  eyebrow: string
  title: string
  description: string
  effectiveDate: string
  lastUpdated: string
  sections: LegalSection[]
  relatedHref: string
  relatedLabel: string
}

export function LegalDocument({
  eyebrow,
  title,
  description,
  effectiveDate,
  lastUpdated,
  sections,
  relatedHref,
  relatedLabel,
}: LegalDocumentProps) {
  return (
    <article className="min-w-0 pb-10 md:pb-24">
      <PageBackLink className="mb-7" />

      <header>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs tracking-wide text-muted-foreground uppercase">
          <span>{eyebrow}</span>
          <span>Effective · {effectiveDate}</span>
        </div>
        <h1 className="mt-4 max-w-[18ch] text-3xl leading-tight font-semibold tracking-tight xs:text-4xl md:text-5xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
          {description}
        </p>
        <p className="mt-3 font-mono text-xs text-muted-foreground">
          Last updated · {lastUpdated}
        </p>
      </header>

      <nav
        aria-label="On this page"
        className="mt-8 border-y border-border py-5"
      >
        <p className="font-mono text-xs tracking-wide text-muted-foreground uppercase">
          On this page
        </p>
        <ol className="mt-3 flex flex-col gap-2">
          {sections.map((section, index) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="inline-flex min-w-0 items-baseline gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <span className="font-mono text-xs text-muted-foreground/70">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">{section.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div
        className={cn(
          "mt-10 max-w-2xl text-base leading-8 text-muted-foreground",
          "[&_a]:font-medium [&_a]:text-foreground [&_a]:underline-offset-4 [&_a:hover]:underline",
          "[&_strong]:font-semibold [&_strong]:text-foreground",
          "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-sm [&_code]:text-foreground",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5",
          "[&_ol]:my-4 [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5",
          "[&_li]:leading-7",
          "[&_p+p]:mt-4"
        )}
      >
        {sections.map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className={cn(
              "scroll-mt-8",
              index > 0 && "mt-10 border-t border-border pt-8"
            )}
          >
            <h2 className="text-xl font-semibold tracking-tight text-foreground xs:text-2xl">
              {section.title}
            </h2>
            <div className="mt-4">{section.content}</div>
          </section>
        ))}
      </div>

      <footer className="mt-14 border-t border-border pt-8">
        <p className="text-sm leading-7 text-muted-foreground">
          Questions about this document? Write to{" "}
          <a href={`mailto:${siteConfig.creator.email}`}>
            {siteConfig.creator.email}
          </a>
          .
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Also see the <Link href={relatedHref}>{relatedLabel}</Link>.
        </p>
      </footer>
    </article>
  )
}
