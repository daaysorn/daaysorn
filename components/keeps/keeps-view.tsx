"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { IconType } from "react-icons"
import useSWR from "swr"
import {
  FaBehance,
  FaDribbble,
  FaFacebookF,
  FaLinkedinIn,
  FaTiktok,
  FaWhatsapp,
} from "react-icons/fa6"
import {
  PiArrowUpRightBold,
  PiArticleFill,
  PiBookmarkSimpleFill,
  PiInstagramLogoFill,
  PiMagnifyingGlassBold,
  PiShareNetworkFill,
  PiXLogoFill,
  PiYoutubeLogoFill,
} from "react-icons/pi"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { Keep } from "@/lib/keeps/types"
import { cn } from "@/lib/utils"

const sourceIcons: Record<string, IconType> = {
  Article: PiArticleFill,
  Behance: FaBehance,
  Dribbble: FaDribbble,
  Instagram: PiInstagramLogoFill,
  TikTok: FaTiktok,
  X: PiXLogoFill,
  YouTube: PiYoutubeLogoFill,
}

const sourceIconColors: Record<string, string> = {
  Article: "text-primary",
  Behance: "text-[#1769ff]",
  Dribbble: "text-[#ea4c89]",
  Instagram: "text-[#e4405f]",
  TikTok: "text-[#fe2c55]",
  X: "text-foreground",
  YouTube: "text-[#ff0000]",
}

function KeepCard({ keep }: { keep: Keep }) {
  const Icon = sourceIcons[keep.source] ?? PiBookmarkSimpleFill
  const shareText = `${keep.title} ${keep.href}`
  const socialShares = [
    {
      label: "Facebook",
      icon: FaFacebookF,
      iconClassName: "text-[#1877f2]",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(keep.href)}`,
    },
    {
      label: "X",
      icon: PiXLogoFill,
      iconClassName: "text-foreground",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "WhatsApp",
      icon: FaWhatsapp,
      iconClassName: "text-[#25d366]",
      href: `https://wa.me/?text=${encodeURIComponent(shareText)}`,
    },
    {
      label: "LinkedIn",
      icon: FaLinkedinIn,
      iconClassName: "text-[#0a66c2]",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(keep.href)}`,
    },
  ]

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: keep.title,
          text: keep.summary,
          url: keep.href,
        })
        return
      }

      await navigator.clipboard.writeText(keep.href)
    } catch {
      // Closing the native share sheet is an expected user action.
    }
  }

  return (
    <div className="group relative min-w-0 border-b border-border px-3 py-8 last:border-b-0 md:px-4 md:py-10">
      <Link
        href={keep.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${keep.title}`}
        className="block min-w-0 cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <div className="grid min-w-0 grid-cols-[5.5rem_minmax(0,1fr)] gap-4 xs:grid-cols-[7rem_minmax(0,1fr)] md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6">
          <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted">
            {keep.imageUrl ? (
              <Image
                loader={({ src }) => src}
                unoptimized
                fill
                src={keep.imageUrl}
                alt=""
                sizes="(min-width: 768px) 10rem, 7rem"
                className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
              />
            ) : (
              <span className="flex size-full items-center justify-center">
                <Icon
                  className={cn(
                    "size-7",
                    sourceIconColors[keep.source] ?? "text-primary"
                  )}
                  aria-hidden="true"
                />
              </span>
            )}
          </div>

          <div className="flex min-w-0 flex-col pb-11">
            <div className="flex flex-col gap-2">
              <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                <Icon
                  aria-label={keep.source}
                  className={cn(
                    "size-3.5 shrink-0",
                    sourceIconColors[keep.source] ?? "text-primary"
                  )}
                />
                {keep.source === "X" ? null : (
                  <span className="font-medium text-foreground">
                    {keep.source}
                  </span>
                )}
                <span aria-hidden="true">·</span>
                <time className="font-mono">{keep.savedAt}</time>
              </div>
              <h2 className="text-lg leading-tight font-semibold transition-colors group-hover:text-primary xs:text-xl md:text-2xl">
                {keep.title}
              </h2>
            </div>
            <div className="mt-3 flex min-w-0 flex-col gap-3">
              <p className="text-sm leading-6 text-muted-foreground md:text-base">
                {keep.summary}
              </p>
              {keep.tags.length ? (
                <p className="min-w-0 text-xs leading-5 text-muted-foreground">
                  {keep.tags.join(" · ")}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </Link>
      <div className="absolute right-3 bottom-7 z-10 flex items-center gap-1 md:right-4 md:bottom-9">
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          onClick={() => void share()}
          aria-label={`Share ${keep.title}`}
          className="rounded-full"
        >
          <PiShareNetworkFill className="text-primary" />
        </Button>
        {socialShares.map(({ label, icon: ShareIcon, iconClassName, href }) => (
          <Button
            key={label}
            variant="ghost"
            size="icon-xs"
            asChild
            className="rounded-full"
          >
            <Link
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Share ${keep.title} on ${label}`}
            >
              <ShareIcon className={iconClassName} />
            </Link>
          </Button>
        ))}
        <Button variant="ghost" size="xs" asChild className="ml-1">
          <Link href={keep.href} target="_blank" rel="noopener noreferrer">
            View
            <PiArrowUpRightBold data-icon="inline-end" />
          </Link>
        </Button>
      </div>
    </div>
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
  const { data, mutate } = useSWR("/api/keeps", fetcher, {
    fallbackData: { keeps: initialKeeps },
    refreshInterval: 60_000,
    revalidateOnFocus: true,
  })

  useEffect(() => {
    const events = new EventSource("/api/keeps/stream")

    events.addEventListener("keeps", (event) => {
      try {
        const next = JSON.parse((event as MessageEvent<string>).data) as {
          keeps: Keep[]
        }
        void mutate(next, { revalidate: false })
      } catch {
        // Ignore malformed events and keep the last valid collection.
      }
    })

    return () => events.close()
  }, [mutate])
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
          <div className="mt-2 scrollbar-none flex max-w-full gap-2 overflow-x-auto pb-1">
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
        <div className="min-w-0">
          {filteredKeeps.map((keep) => (
            <KeepCard key={keep.id} keep={keep} />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {query.trim() || activeTag !== "All"
                ? "Can’t find that Keep"
                : "No Keeps yet"}
            </CardTitle>
            <CardDescription>
              {query.trim() || activeTag !== "All"
                ? "Try another word or choose a different topic."
                : "New links will appear here after I send them to the Keeps bot."}
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </article>
  )
}
