"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import type { IconType } from "react-icons"
import useSWR from "swr"
import {
  PiArrowUpRightBold,
  PiArticleFill,
  PiBookmarkSimpleFill,
  PiInstagramLogoFill,
  PiMagnifyingGlassBold,
  PiXLogoFill,
  PiYoutubeLogoFill,
} from "react-icons/pi"

import { Badge } from "@/components/ui/badge"
import { BentoGrid } from "@/components/ui/bento-grid"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Keep } from "@/lib/keeps/types"

const sourceIcons: Record<string, IconType> = {
  Article: PiArticleFill,
  Instagram: PiInstagramLogoFill,
  X: PiXLogoFill,
  YouTube: PiYoutubeLogoFill,
}

function KeepCard({
  keep,
  featured = false,
}: {
  keep: Keep
  featured?: boolean
}) {
  const Icon = sourceIcons[keep.source] ?? PiBookmarkSimpleFill

  return (
    <Card
      className={cn(
        "group h-full min-w-0 transition-transform duration-500 motion-safe:hover:-translate-y-1",
        featured && "md:col-span-2"
      )}
    >
      <CardHeader>
        <Badge variant="secondary">
          <Icon data-icon="inline-start" />
          {keep.source}
        </Badge>
        <CardAction>
          <span className="font-mono text-xs text-muted-foreground">
            {keep.savedAt}
          </span>
        </CardAction>
        <CardTitle
          className={cn(
            "mt-5 text-xl leading-tight font-semibold",
            featured && "text-2xl xs:text-3xl"
          )}
        >
          {keep.title}
        </CardTitle>
        <CardDescription className="text-xs font-medium tracking-wide uppercase">
          {keep.author}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <p className="leading-6 text-muted-foreground">{keep.summary}</p>
        <div className="flex flex-wrap gap-2">
          {keep.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      </CardContent>
      <CardFooter className="justify-end">
        <Link
          href={keep.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Open ${keep.title}`}
          className="rounded-sm text-sm font-medium text-foreground transition-colors hover:text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          Original
          <PiArrowUpRightBold className="ml-1 inline size-3" />
        </Link>
      </CardFooter>
    </Card>
  )
}

const fetcher = async (url: string): Promise<{ keeps: Keep[] }> => {
  const response = await fetch(url)
  if (!response.ok) throw new Error("Keeps could not be loaded")
  return response.json() as Promise<{ keeps: Keep[] }>
}

export function KeepsView({ initialKeeps }: { initialKeeps: Keep[] }) {
  const [query, setQuery] = useState("")
  const [activeTag, setActiveTag] = useState("All")
  const { data } = useSWR("/api/keeps", fetcher, {
    fallbackData: { keeps: initialKeeps },
    refreshInterval: 30_000,
    revalidateOnFocus: true,
  })
  const keeps = data?.keeps ?? initialKeeps
  const tags = useMemo(
    () => ["All", ...new Set(keeps.flatMap((keep) => keep.tags))],
    [keeps]
  )
  const filteredKeeps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return keeps.filter((keep) => {
      const matchesTag = activeTag === "All" || keep.tags.includes(activeTag)
      const matchesQuery =
        !normalizedQuery ||
        [keep.title, keep.summary, keep.source, keep.author, ...keep.tags].some(
          (value) => value.toLowerCase().includes(normalizedQuery)
        )

      return matchesTag && matchesQuery
    })
  }, [activeTag, keeps, query])

  return (
    <article className="w-full min-w-0 pb-8 md:pb-24">
      <header className="flex flex-col gap-5 pb-8 md:pb-10">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
              Keeps
            </h1>
            <p className="text-base leading-7 text-muted-foreground md:text-lg md:leading-8">
              Posts, articles, videos, and ideas I found worth keeping.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <label className="relative block w-full">
            <span className="sr-only">Search Keeps</span>
            <PiMagnifyingGlassBold className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Keeps"
              className="pl-9"
            />
          </label>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={activeTag === tag}
                onClick={() => setActiveTag(tag)}
                className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                <Badge variant={activeTag === tag ? "default" : "outline"}>
                  {tag}
                </Badge>
              </button>
            ))}
          </div>
        </div>
      </header>

      {filteredKeeps.length ? (
        <BentoGrid className="min-w-0 auto-rows-auto grid-cols-1 md:grid-cols-2">
          {filteredKeeps.map((keep, index) => (
            <div
              key={keep.id}
              className={cn(
                "min-w-0",
                (index === 0 || index % 4 === 3) && "md:col-span-2"
              )}
            >
              <KeepCard keep={keep} featured={index === 0} />
            </div>
          ))}
        </BentoGrid>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Keeps yet</CardTitle>
            <CardDescription>
              New links will appear here after I send them to the Keeps bot.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </article>
  )
}
