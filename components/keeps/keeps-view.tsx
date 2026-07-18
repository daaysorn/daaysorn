"use client"

import Image from "next/image"
import Link from "next/link"
import { Fragment, useEffect, useMemo, useState } from "react"
import type { IconType } from "react-icons"
import useSWR from "swr"
import {
  FaBehance,
  FaDribbble,
  FaFacebookF,
  FaGithub,
  FaLinkedinIn,
  FaRedditAlien,
  FaSoundcloud,
  FaSpotify,
  FaThreads,
  FaTiktok,
  FaVimeoV,
  FaWhatsapp,
} from "react-icons/fa6"
import {
  PiArrowUpRightBold,
  PiArticleFill,
  PiBookmarkSimpleFill,
  PiInstagramLogoFill,
  PiShareNetworkFill,
  PiXLogoFill,
  PiYoutubeLogoFill,
} from "react-icons/pi"

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
  Facebook: FaFacebookF,
  GitHub: FaGithub,
  Instagram: PiInstagramLogoFill,
  LinkedIn: FaLinkedinIn,
  Reddit: FaRedditAlien,
  SoundCloud: FaSoundcloud,
  Spotify: FaSpotify,
  Threads: FaThreads,
  TikTok: FaTiktok,
  Vimeo: FaVimeoV,
  X: PiXLogoFill,
  YouTube: PiYoutubeLogoFill,
}

const sourceIconColors: Record<string, string> = {
  Article: "text-primary",
  Behance: "text-[#1769ff]",
  Dribbble: "text-[#ea4c89]",
  Facebook: "text-[#1877f2]",
  GitHub: "text-foreground",
  Instagram: "text-[#e4405f]",
  LinkedIn: "text-[#0a66c2]",
  Reddit: "text-[#ff4500]",
  SoundCloud: "text-[#ff5500]",
  Spotify: "text-[#1db954]",
  Threads: "text-foreground",
  TikTok: "text-[#fe2c55]",
  Vimeo: "text-[#1ab7ea]",
  X: "text-foreground",
  YouTube: "text-[#ff0000]",
}

function KeepCard({ keep }: { keep: Keep }) {
  const Icon = sourceIcons[keep.source] ?? PiBookmarkSimpleFill
  const [failedImageUrl, setFailedImageUrl] = useState<string | null>(null)
  const showImage = Boolean(keep.imageUrl && keep.imageUrl !== failedImageUrl)
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
        <div className="min-w-0 after:clear-both after:block md:grid md:grid-cols-[10rem_minmax(0,1fr)] md:gap-6 md:after:hidden">
          <div className="relative float-left mr-4 mb-2 aspect-[4/5] w-24 overflow-hidden rounded-md bg-muted xs:mb-3 xs:w-28 md:float-none md:m-0 md:w-auto">
            {showImage && keep.imageUrl ? (
              <Image
                loader={({ src }) => src}
                unoptimized
                fill
                src={keep.imageUrl}
                alt=""
                sizes="(min-width: 768px) 10rem, 7rem"
                className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-[1.02]"
                onError={() => setFailedImageUrl(keep.imageUrl)}
              />
            ) : (
              <span
                role="img"
                aria-label={`${keep.source} preview unavailable`}
                className="flex size-full items-center justify-center"
              >
                <Icon
                  className={cn(
                    "size-9 md:size-10",
                    sourceIconColors[keep.source] ?? "text-primary"
                  )}
                />
              </span>
            )}
          </div>

          <div className="min-w-0 pb-11 md:flex md:flex-col">
            <div className="md:flex md:flex-col md:gap-2">
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
              <h2 className="mt-2 text-lg leading-tight font-semibold transition-colors group-hover:text-primary xs:text-xl md:mt-0 md:text-2xl">
                {keep.title}
              </h2>
            </div>
            <div className="mt-3 min-w-0 space-y-3 md:flex md:flex-col md:gap-3 md:space-y-0">
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

function seededOrder(value: string) {
  let hash = 2166136261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

export function KeepsView({
  initialKeeps,
  shuffleSeed,
}: {
  initialKeeps: Keep[]
  shuffleSeed: string
}) {
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
  const shuffledKeeps = useMemo(
    () =>
      [...keeps].sort(
        (first, second) =>
          seededOrder(`${shuffleSeed}:${first.id}`) -
          seededOrder(`${shuffleSeed}:${second.id}`)
      ),
    [keeps, shuffleSeed]
  )
  const tags = useMemo(
    () => ["All", "Latest", ...new Set(keeps.flatMap((keep) => keep.tags))],
    [keeps]
  )
  const filteredKeeps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const orderedKeeps = activeTag === "Latest" ? keeps : shuffledKeeps

    return orderedKeeps.filter((keep) => {
      const matchesTag =
        activeTag === "All" ||
        activeTag === "Latest" ||
        keep.tags.includes(activeTag)
      const matchesQuery =
        !normalizedQuery ||
        [keep.title, keep.summary, keep.source, keep.author, ...keep.tags].some(
          (value) => value.toLowerCase().includes(normalizedQuery)
        )

      return matchesTag && matchesQuery
    })
  }, [activeTag, keeps, query, shuffledKeeps])

  return (
    <article className="w-full min-w-0 pb-8 md:pb-24">
      <header className="flex flex-col gap-5 pb-4 md:pb-5">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
              Keeps
            </h1>
            <p className="text-xs leading-5 whitespace-nowrap text-muted-foreground md:text-lg md:leading-8">
              Posts, articles, videos, and ideas I found worth keeping.
            </p>
          </div>
        </div>

        <div className="flex min-w-0 flex-col border-b border-border">
          <label className="block w-full">
            <span className="sr-only">Search Keeps</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Keeps…"
              className="h-10 rounded-none border-0 border-b border-border bg-transparent px-0 py-2 text-sm font-normal shadow-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 md:text-sm dark:bg-transparent"
            />
          </label>
          <div className="scrollbar-none flex max-w-full items-center gap-4 overflow-x-auto pt-5 pb-2 md:gap-5 md:pt-6">
            {tags.map((tag, index) => (
              <Fragment key={tag}>
                {index > 0 ? (
                  <span
                    aria-hidden="true"
                    className="h-4 shrink-0 border-l border-border"
                  />
                ) : null}
                <button
                  type="button"
                  aria-pressed={activeTag === tag}
                  onClick={() => setActiveTag(tag)}
                  className="shrink-0 rounded-sm text-xs font-medium text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:font-semibold aria-pressed:text-foreground md:text-sm"
                >
                  {tag}
                </button>
              </Fragment>
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
