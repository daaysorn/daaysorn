"use client"

import Image from "next/image"
import Link from "next/link"
import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
  PiExportFill,
  PiInstagramLogoFill,
  PiShareNetworkFill,
  PiXLogoFill,
  PiYoutubeLogoFill,
} from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { trackKeepsEvent } from "@/lib/analytics"
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

function KeepCard({
  keep,
  isSaved,
  onToggleSaved,
}: {
  keep: Keep
  isSaved: boolean
  onToggleSaved: (keep: Keep) => void
}) {
  const Icon = sourceIcons[keep.source] ?? PiBookmarkSimpleFill
  const cardRef = useRef<HTMLDivElement>(null)
  const impressionSent = useRef(false)
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
        trackKeepsEvent("keep_share", {
          method: "native",
          content_id: keep.id,
          content_name: keep.title,
          content_source: keep.source,
        })
        return
      }

      await navigator.clipboard.writeText(keep.href)
      trackKeepsEvent("keep_share", {
        method: "copy",
        content_id: keep.id,
        content_name: keep.title,
        content_source: keep.source,
      })
    } catch {
      // Closing the native share sheet is an expected user action.
    }
  }

  useEffect(() => {
    const card = cardRef.current
    if (!card || impressionSent.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting || impressionSent.current) return
        impressionSent.current = true
        trackKeepsEvent("keep_impression", {
          content_id: keep.id,
          content_name: keep.title,
          content_source: keep.source,
          has_preview: Boolean(keep.imageUrl),
        })
        observer.disconnect()
      },
      { threshold: 0.5 }
    )

    observer.observe(card)
    return () => observer.disconnect()
  }, [keep.id, keep.imageUrl, keep.source, keep.title])

  return (
    <div
      ref={cardRef}
      className="group relative min-w-0 border-b border-border px-3 py-8 last:border-b-0 md:px-4 md:py-10"
    >
      <Link
        href={keep.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${keep.title}`}
        onClick={() =>
          trackKeepsEvent("keep_open", {
            content_id: keep.id,
            content_name: keep.title,
            content_source: keep.source,
          })
        }
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
                onError={() => {
                  setFailedImageUrl(keep.imageUrl)
                  trackKeepsEvent("keep_preview_error", {
                    content_id: keep.id,
                    content_name: keep.title,
                    content_source: keep.source,
                  })
                }}
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
          onClick={() => onToggleSaved(keep)}
          aria-label={`${isSaved ? "Remove" : "Save"} ${keep.title} ${isSaved ? "from" : "to"} favourites`}
          aria-pressed={isSaved}
          className="rounded-full"
        >
          <PiBookmarkSimpleFill
            className={cn(isSaved ? "text-primary" : "text-muted-foreground")}
          />
        </Button>
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
              onClick={() =>
                trackKeepsEvent("keep_share", {
                  method: label.toLowerCase(),
                  content_id: keep.id,
                  content_name: keep.title,
                  content_source: keep.source,
                })
              }
            >
              <ShareIcon className={iconClassName} />
            </Link>
          </Button>
        ))}
        <Button variant="ghost" size="xs" asChild className="ml-1">
          <Link
            href={keep.href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackKeepsEvent("keep_open", {
                content_id: keep.id,
                content_name: keep.title,
                content_source: keep.source,
                location: "view_action",
              })
            }
          >
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

type KeepsSyncSession = { id: string; secret: string }
type KeepsSyncChange = { keepId: string; saved: boolean }

const favouritesKey = "daaysorn-keeps-favourites"
const syncSessionKey = "daaysorn-keeps-sync-session"
const pendingChangesKey = "daaysorn-keeps-sync-pending"

function readStoredArray<T>(key: string): T[] {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(key) ?? "[]"
    ) as unknown
    return Array.isArray(value) ? (value as T[]) : []
  } catch {
    return []
  }
}

function storeFavouriteIds(ids: string[]) {
  window.localStorage.setItem(favouritesKey, JSON.stringify(ids))
}

function queueSyncChange(change: KeepsSyncChange) {
  const pending = readStoredArray<KeepsSyncChange>(pendingChangesKey).filter(
    (item) => item.keepId !== change.keepId
  )
  window.localStorage.setItem(
    pendingChangesKey,
    JSON.stringify([...pending, change])
  )
}

function storedSyncSession(): KeepsSyncSession | null {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(syncSessionKey) ?? "null"
    ) as Partial<KeepsSyncSession> | null
    return typeof value?.id === "string" && typeof value.secret === "string"
      ? { id: value.id, secret: value.secret }
      : null
  } catch {
    return null
  }
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
  const [savedKeepIds, setSavedKeepIds] = useState<string[]>([])
  const [syncStatus, setSyncStatus] = useState("")
  const [syncSession, setSyncSession] = useState<KeepsSyncSession | null>(null)
  const { data } = useSWR("/api/keeps", fetcher, {
    fallbackData: { keeps: initialKeeps },
    refreshInterval: 120_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })

  const syncCollection = useCallback(async (session: KeepsSyncSession) => {
    if (!navigator.onLine) return

    try {
      const pending = readStoredArray<KeepsSyncChange>(pendingChangesKey)
      const response = await fetch("/api/keeps/sync", {
        method: pending.length ? "PATCH" : "GET",
        headers: {
          Authorization: `Bearer ${session.id}.${session.secret}`,
          ...(pending.length ? { "Content-Type": "application/json" } : {}),
        },
        body: pending.length ? JSON.stringify({ changes: pending }) : undefined,
      })

      if (response.status === 401) {
        window.localStorage.removeItem(syncSessionKey)
        setSyncSession(null)
        setSyncStatus("This export link is no longer valid.")
        trackKeepsEvent("keeps_sync", { outcome: "unauthorized" })
        return
      }

      if (!response.ok) return
      const data = (await response.json()) as { savedIds?: unknown }
      const serverIds = Array.isArray(data.savedIds)
        ? data.savedIds.filter((id): id is string => typeof id === "string")
        : []

      if (pending.length) {
        const submitted = new Map(
          pending.map((change) => [change.keepId, change.saved])
        )
        const remaining = readStoredArray<KeepsSyncChange>(
          pendingChangesKey
        ).filter((change) => submitted.get(change.keepId) !== change.saved)
        window.localStorage.setItem(
          pendingChangesKey,
          JSON.stringify(remaining)
        )
      }

      storeFavouriteIds(serverIds)
      setSavedKeepIds(serverIds)
      setSyncStatus("Saved Keeps are up to date.")
      if (pending.length) {
        trackKeepsEvent("keeps_sync", {
          outcome: "success",
          changes_count: pending.length,
          saved_count: serverIds.length,
        })
      }
    } catch {
      // Offline changes remain queued until the next successful connection.
      trackKeepsEvent("keeps_sync", { outcome: "request_failed" })
    }
  }, [])

  useEffect(() => {
    const savedIds = readStoredArray<unknown>(favouritesKey).filter(
      (id): id is string => typeof id === "string"
    )
    const params = new URLSearchParams(window.location.hash.slice(1))
    const syncToken = params.get("keeps-sync")
    const legacyFragment = params.get("saved")
    let session = storedSyncSession()

    if (legacyFragment) {
      try {
        const imported = JSON.parse(
          atob(legacyFragment.replaceAll("-", "+").replaceAll("_", "/"))
        ) as unknown
        if (Array.isArray(imported)) {
          imported
            .filter((id): id is string => typeof id === "string")
            .forEach((id) => {
              if (!savedIds.includes(id)) savedIds.push(id)
            })
        }
      } catch {
        // Ignore malformed legacy transfer links.
      }
    }

    if (syncToken) {
      const separator = syncToken.indexOf(".")
      const id = syncToken.slice(0, separator)
      const secret = syncToken.slice(separator + 1)
      if (separator > 0 && id && secret) {
        session = { id, secret }
        window.localStorage.setItem(syncSessionKey, JSON.stringify(session))
        savedIds.forEach((keepId) => queueSyncChange({ keepId, saved: true }))
        setSyncStatus("This device is now connected to Saved Keeps.")
        trackKeepsEvent("keeps_device_join", {
          local_saved_count: savedIds.length,
        })
      }
    }

    setSavedKeepIds(savedIds)
    storeFavouriteIds(savedIds)
    setSyncSession(session)
    if (session) void syncCollection(session)

    if (syncToken || legacyFragment) {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [syncCollection])

  useEffect(() => {
    if (!syncSession) return

    const synchronize = () => void syncCollection(syncSession)
    const interval = window.setInterval(synchronize, 120_000)
    window.addEventListener("online", synchronize)
    window.addEventListener("focus", synchronize)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("online", synchronize)
      window.removeEventListener("focus", synchronize)
    }
  }, [syncCollection, syncSession])

  const toggleSaved = (keep: Keep) => {
    setSavedKeepIds((current) => {
      const next = current.includes(keep.id)
        ? current.filter((id) => id !== keep.id)
        : [...current, keep.id]
      storeFavouriteIds(next)

      if (syncSession) {
        queueSyncChange({ keepId: keep.id, saved: next.includes(keep.id) })
        void syncCollection(syncSession)
      }
      trackKeepsEvent("keep_favourite", {
        action: next.includes(keep.id) ? "save" : "remove",
        content_id: keep.id,
        content_name: keep.title,
        content_source: keep.source,
        saved_count: next.length,
        sync_enabled: Boolean(syncSession),
      })
      return next
    })
  }

  const exportKeeps = async () => {
    try {
      let session = syncSession
      if (!session) {
        const response = await fetch("/api/keeps/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ savedIds: savedKeepIds }),
        })
        if (!response.ok) throw new Error("Export could not be created")
        session = (await response.json()) as KeepsSyncSession
        window.localStorage.setItem(syncSessionKey, JSON.stringify(session))
        setSyncSession(session)
        trackKeepsEvent("keeps_export_created", {
          saved_count: savedKeepIds.length,
        })
      } else {
        await syncCollection(session)
      }

      const syncUrl = `${window.location.origin}${window.location.pathname}#keeps-sync=${session.id}.${session.secret}`
      if (navigator.share) {
        await navigator.share({
          title: "My saved Keeps",
          text: "Open this private link on another device to keep Saved Keeps in sync.",
          url: syncUrl,
        })
        setSyncStatus("Private export link shared.")
        trackKeepsEvent("keeps_export", {
          method: "native",
          outcome: "success",
          saved_count: savedKeepIds.length,
        })
      } else {
        await navigator.clipboard.writeText(syncUrl)
        setSyncStatus("Private export link copied.")
        trackKeepsEvent("keeps_export", {
          method: "copy",
          outcome: "success",
          saved_count: savedKeepIds.length,
        })
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") {
        setSyncStatus("Could not export Saved Keeps.")
        trackKeepsEvent("keeps_export", { outcome: "error" })
      }
    }
  }

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
    () => [
      "All",
      "Saved Keeps",
      "Latest",
      ...new Set(keeps.flatMap((keep) => keep.tags)),
    ],
    [keeps, savedKeepIds.length]
  )
  const filteredKeeps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    const orderedKeeps = activeTag === "Latest" ? keeps : shuffledKeeps

    return orderedKeeps.filter((keep) => {
      const matchesTag =
        activeTag === "All" ||
        activeTag === "Latest" ||
        (activeTag === "Saved Keeps" && savedKeepIds.includes(keep.id)) ||
        keep.tags.includes(activeTag)
      const matchesQuery =
        !normalizedQuery ||
        [keep.title, keep.summary, keep.source, keep.author, ...keep.tags].some(
          (value) => value.toLowerCase().includes(normalizedQuery)
        )

      return matchesTag && matchesQuery
    })
  }, [activeTag, keeps, query, savedKeepIds, shuffledKeeps])

  useEffect(() => {
    trackKeepsEvent("keeps_view", { keep_count: keeps.length })
  }, [keeps.length])

  useEffect(() => {
    const normalizedQuery = query.trim()
    if (normalizedQuery.length < 2) return

    const timer = window.setTimeout(() => {
      trackKeepsEvent("keeps_search", {
        query_length:
          normalizedQuery.length < 5
            ? "2_4"
            : normalizedQuery.length < 10
              ? "5_9"
              : "10_plus",
        result_count: filteredKeeps.length,
      })
    }, 750)

    return () => window.clearTimeout(timer)
  }, [filteredKeeps.length, query])

  const selectFilter = (tag: string) => {
    setActiveTag(tag)
    trackKeepsEvent("keeps_filter", {
      filter_name: tag,
      filter_type:
        tag === "All" || tag === "Latest" || tag === "Saved Keeps"
          ? "system"
          : "topic",
      saved_count: savedKeepIds.length,
    })
  }

  return (
    <article className="w-full min-w-0 pb-8 md:pb-24">
      <header className="flex flex-col gap-5 pb-4 md:pb-5">
        <div className="flex min-w-0 flex-col gap-3">
          <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
            Keeps
          </h1>
          <div className="flex flex-col gap-3">
            <p className="text-xs leading-5 text-muted-foreground md:text-base md:leading-7">
              Posts, articles, videos, and ideas I found worth keeping. Save
              your favourites here and take them across your devices.
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
                  aria-label={
                    tag === "Saved Keeps"
                      ? `Saved Keeps, ${savedKeepIds.length} saved`
                      : undefined
                  }
                  onClick={() => selectFilter(tag)}
                  className="inline-flex shrink-0 items-start gap-1 rounded-sm text-xs font-medium text-muted-foreground no-underline transition-colors hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:font-semibold aria-pressed:text-foreground md:text-sm"
                >
                  {tag}
                  {tag === "Saved Keeps" ? (
                    <sup aria-hidden="true" className="-mt-1">
                      <Badge
                        variant="destructive"
                        className="h-4 min-w-4 px-1 py-0 text-[0.625rem] leading-none"
                      >
                        {savedKeepIds.length}
                      </Badge>
                    </sup>
                  ) : null}
                </button>
              </Fragment>
            ))}
          </div>
        </div>
      </header>

      {activeTag === "Saved Keeps" && savedKeepIds.length ? (
        <div className="flex min-w-0 items-center justify-between gap-3 pb-2">
          <p aria-live="polite" className="text-xs text-muted-foreground">
            {syncStatus || "Sync across your devices. 👉"}
          </p>
          <Button
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => void exportKeeps()}
          >
            <PiExportFill data-icon="inline-start" />
            Export to other devices
          </Button>
        </div>
      ) : null}

      {filteredKeeps.length ? (
        <div className="min-w-0">
          {filteredKeeps.map((keep) => (
            <KeepCard
              key={keep.id}
              keep={keep}
              isSaved={savedKeepIds.includes(keep.id)}
              onToggleSaved={toggleSaved}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {activeTag === "Saved Keeps" && !query.trim()
                ? "No Saved Keeps yet"
                : query.trim() || activeTag !== "All"
                  ? "Can’t find that Keep"
                  : "No Keeps yet"}
            </CardTitle>
            <CardDescription>
              {activeTag === "Saved Keeps" && !query.trim()
                ? "Browse Keeps and save anything you would like to return to later."
                : query.trim() || activeTag !== "All"
                  ? "Try another word or choose a different topic."
                  : "New links will appear here after I send them to the Keeps bot."}
            </CardDescription>
          </CardHeader>
          {activeTag === "Saved Keeps" && !query.trim() ? (
            <CardContent>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => selectFilter("All")}
              >
                <PiBookmarkSimpleFill data-icon="inline-start" />
                Browse Keeps
              </Button>
            </CardContent>
          ) : null}
        </Card>
      )}
    </article>
  )
}
