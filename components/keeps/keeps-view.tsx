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
import { PageBackLink } from "@/components/nav/page-back-link"
import {
  favouritesStorageKey,
  readDeviceSyncSession,
  syncSessionStorageKey,
  type DeviceSyncSession,
} from "@/lib/device-sync"
import type { Keep } from "@/lib/keeps/types"
import { keepTagTaxonomy } from "@/lib/keeps/metadata"
import { normalizeKeepUrl } from "@/lib/keeps/url"
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

function removeHashtags(value: string) {
  return value
    .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, "$1")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,;:])(?=[.!?])/g, "")
    .replace(/[,:;]\s*([”"']?)$/u, "$1")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function isXIdentityTitle(value: string) {
  return (
    /\(@[A-Za-z0-9_]+\)\s+on\s+(?:X|Twitter)$/i.test(value.trim()) ||
    /^@[A-Za-z0-9_]+(?:\s+on\s+(?:X|Twitter))?$/i.test(value.trim())
  )
}

function keepDisplayTitle(keep: Keep) {
  const title = removeHashtags(keep.title)
  if (keep.source !== "X" || !isXIdentityTitle(title)) {
    return title || keep.source
  }

  const contextualTitle = removeHashtags(keep.summary)
    .split(/(?<=[.!?])\s/u)[0]
    ?.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()

  return contextualTitle || "X post"
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
  const displayTitle = keepDisplayTitle(keep)
  const displaySummary = removeHashtags(keep.summary)
  const shareText = `${displayTitle} ${keep.href}`
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
          title: displayTitle,
          text: displaySummary,
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
      className="group relative min-w-0 border-border px-3 py-8 last:border-b-0 md:px-4 md:py-10"
    >
      <Link
        href={keep.href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`View ${displayTitle}`}
        onClick={() =>
          trackKeepsEvent("keep_open", {
            content_id: keep.id,
            content_name: keep.title,
            content_source: keep.source,
          })
        }
        className="block min-w-0 cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none"
      >
        <div className="min-w-0 after:clear-both after:block">
          <div className="relative float-left mr-4 mb-2 aspect-4/5 w-24 overflow-hidden rounded-md bg-muted xs:mb-3 xs:w-28 md:mr-6 md:mb-3 md:w-40">
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

          <div className="min-w-0 pb-11">
            <div className="min-w-0">
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
              <h2 className="mt-2 text-lg leading-tight font-semibold transition-colors group-hover:text-primary xs:text-xl md:text-2xl">
                {displayTitle}
              </h2>
            </div>
            <div className="mt-3 min-w-0 space-y-3">
              {displaySummary ? (
                <p className="text-sm leading-6 text-muted-foreground md:text-base">
                  {displaySummary}
                </p>
              ) : null}
              {keep.tags.length ? (
                <p className="min-w-0 text-xs leading-5 text-muted-foreground">
                  {keep.tags.slice(0, 2).join(" · ")}
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
          aria-label={`${isSaved ? "Remove" : "Save"} ${displayTitle} ${isSaved ? "from" : "to"} favourites`}
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
          aria-label={`Share ${displayTitle}`}
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
              aria-label={`Share ${displayTitle} on ${label}`}
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

type KeepsSyncSession = DeviceSyncSession
type KeepsSyncChange = { keepId: string; saved: boolean }

const favouritesKey = favouritesStorageKey
const syncSessionKey = syncSessionStorageKey
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

async function postKeepsSyncMessage(
  type: "QUEUE_KEEPS_SYNC" | "CLEAR_KEEPS_SYNC",
  session: KeepsSyncSession,
  changes: KeepsSyncChange[]
) {
  if (!("serviceWorker" in navigator) || !changes.length) return

  const registration = await navigator.serviceWorker.getRegistration("/")
  registration?.active?.postMessage({ type, session, changes })
}

function queueSyncChange(
  change: KeepsSyncChange,
  session?: KeepsSyncSession | null
) {
  const pending = readStoredArray<KeepsSyncChange>(pendingChangesKey).filter(
    (item) => item.keepId !== change.keepId
  )
  window.localStorage.setItem(
    pendingChangesKey,
    JSON.stringify([...pending, change])
  )

  if (session && !navigator.onLine) {
    void postKeepsSyncMessage("QUEUE_KEEPS_SYNC", session, [change])
  }
}

function storedSyncSession(): KeepsSyncSession | null {
  return readDeviceSyncSession()
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
  const [shareStatus, setShareStatus] = useState("")
  const [storageReady, setStorageReady] = useState(false)
  const [syncSession, setSyncSession] = useState<KeepsSyncSession | null>(null)
  const { data, mutate } = useSWR("/api/keeps", fetcher, {
    fallbackData: { keeps: initialKeeps },
    refreshInterval: 600_000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  })
  const keeps = data?.keeps ?? initialKeeps

  const refreshPublicKeeps = useCallback(async () => {
    try {
      const fresh = await fetcher(`/api/keeps?live=${Date.now()}`)
      await mutate(fresh, { revalidate: false })
      trackKeepsEvent("keeps_realtime", { outcome: "public_feed_updated" })
    } catch {
      trackKeepsEvent("keeps_realtime", {
        outcome: "public_feed_refresh_failed",
      })
    }
  }, [mutate])

  const syncCollection = useCallback(async (session: KeepsSyncSession) => {
    const pending = readStoredArray<KeepsSyncChange>(pendingChangesKey)
    if (!navigator.onLine) {
      void postKeepsSyncMessage("QUEUE_KEEPS_SYNC", session, pending)
      return
    }

    try {
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

      if (!response.ok) {
        void postKeepsSyncMessage("QUEUE_KEEPS_SYNC", session, pending)
        return
      }
      const data = (await response.json()) as { savedIds?: unknown }
      const serverIds = Array.isArray(data.savedIds)
        ? data.savedIds.filter((id): id is string => typeof id === "string")
        : []

      if (pending.length) {
        void postKeepsSyncMessage("CLEAR_KEEPS_SYNC", session, pending)
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
      void postKeepsSyncMessage("QUEUE_KEEPS_SYNC", session, pending)
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
        savedIds.forEach((keepId) =>
          queueSyncChange({ keepId, saved: true }, session)
        )
        queueMicrotask(() =>
          setSyncStatus("This device is now connected to Saved Keeps.")
        )
        trackKeepsEvent("keeps_device_join", {
          local_saved_count: savedIds.length,
        })
      }
    }

    storeFavouriteIds(savedIds)
    queueMicrotask(() => {
      setSavedKeepIds(savedIds)
      setStorageReady(true)
      setSyncSession(session)
    })
    if (session) queueMicrotask(() => void syncCollection(session))

    if (syncToken || legacyFragment) {
      window.history.replaceState(null, "", window.location.pathname)
    }
  }, [syncCollection])

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const receiveBackgroundSync = (event: MessageEvent) => {
      if (event.data?.type === "KEEPS_BACKGROUND_SYNCED") {
        const serverIds = Array.isArray(event.data.savedIds)
          ? event.data.savedIds.filter(
              (id: unknown): id is string => typeof id === "string"
            )
          : []
        storeFavouriteIds(serverIds)
        setSavedKeepIds(serverIds)
        setSyncStatus("Saved Keeps were updated in the background.")
        trackKeepsEvent("keeps_sync", { outcome: "background_success" })
      }

      if (event.data?.type === "KEEPS_BACKGROUND_SYNC_UNAUTHORIZED") {
        window.localStorage.removeItem(syncSessionKey)
        setSyncSession(null)
        setSyncStatus("This export link is no longer valid.")
        trackKeepsEvent("keeps_sync", {
          outcome: "background_unauthorized",
        })
      }
    }

    navigator.serviceWorker.addEventListener("message", receiveBackgroundSync)
    return () =>
      navigator.serviceWorker.removeEventListener(
        "message",
        receiveBackgroundSync
      )
  }, [])

  useEffect(() => {
    if (!storageReady) return

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const hashParams = new URLSearchParams(window.location.hash.slice(1))
      const encodedShare = hashParams.get("share-target")
      let fragmentShare: { title?: unknown; text?: unknown; url?: unknown } = {}

      if (encodedShare) {
        try {
          const normalized = encodedShare
            .replaceAll("-", "+")
            .replaceAll("_", "/")
            .padEnd(Math.ceil(encodedShare.length / 4) * 4, "=")
          const bytes = Uint8Array.from(atob(normalized), (character) =>
            character.charCodeAt(0)
          )
          fragmentShare = JSON.parse(
            new TextDecoder().decode(bytes)
          ) as typeof fragmentShare
        } catch {
          fragmentShare = {}
        }
      }

      const sharedTitle =
        (typeof fragmentShare.title === "string"
          ? fragmentShare.title
          : params.get("shared_title")
        )?.trim() ?? ""
      const sharedText =
        (typeof fragmentShare.text === "string"
          ? fragmentShare.text
          : params.get("shared_text")
        )?.trim() ?? ""
      const sharedUrl =
        (typeof fragmentShare.url === "string"
          ? fragmentShare.url
          : params.get("shared_url")
        )?.trim() ||
        sharedText.match(/https?:\/\/[^\s<>]+/i)?.[0] ||
        ""
      if (!sharedUrl) {
        if (encodedShare || sharedTitle || sharedText) {
          setShareStatus("That shared item does not contain a valid link.")
          window.history.replaceState(null, "", window.location.pathname)
        }
        return
      }

      let normalizedSharedUrl = ""
      try {
        normalizedSharedUrl = normalizeKeepUrl(sharedUrl)
      } catch {
        setShareStatus("That shared item does not contain a valid link.")
        window.history.replaceState(null, "", window.location.pathname)
        return
      }

      const matchedKeep = keeps.find((keep) => {
        try {
          return normalizeKeepUrl(keep.href) === normalizedSharedUrl
        } catch {
          return false
        }
      })

      if (!matchedKeep) {
        setShareStatus(
          sharedTitle
            ? `“${sharedTitle}” is not in Keeps yet.`
            : "That link is not in Keeps yet."
        )
      } else {
        setSavedKeepIds((current) => {
          if (current.includes(matchedKeep.id)) return current
          const next = [...current, matchedKeep.id]
          storeFavouriteIds(next)
          if (syncSession) {
            queueSyncChange(
              { keepId: matchedKeep.id, saved: true },
              syncSession
            )
            void syncCollection(syncSession)
          }
          trackKeepsEvent("keep_favourite", {
            action: "save",
            content_id: matchedKeep.id,
            content_name: matchedKeep.title,
            content_source: matchedKeep.source,
            saved_count: next.length,
            sync_enabled: Boolean(syncSession),
            location: "share_target",
          })
          return next
        })
        setActiveTag("Saved Keeps")
        setShareStatus(`Saved “${matchedKeep.title}” to this device.`)
      }

      window.history.replaceState(null, "", window.location.pathname)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [keeps, storageReady, syncCollection, syncSession])

  useEffect(() => {
    if (!syncSession) return

    const synchronize = () => void syncCollection(syncSession)
    const interval = window.setInterval(synchronize, 900_000)
    window.addEventListener("online", synchronize)
    window.addEventListener("focus", synchronize)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener("online", synchronize)
      window.removeEventListener("focus", synchronize)
    }
  }, [syncCollection, syncSession])

  useEffect(() => {
    if (!syncSession) return

    let realtime: import("ably").Realtime | undefined
    let channel: import("ably").RealtimeChannel | undefined
    let publicChannel: import("ably").RealtimeChannel | undefined
    let cancelled = false
    const receiveChange = () => {
      trackKeepsEvent("keeps_realtime", { outcome: "update_received" })
      void syncCollection(syncSession)
    }
    const reconnect = () => void syncCollection(syncSession)
    const receivePublicChange = () => void refreshPublicKeeps()

    const connect = async () => {
      try {
        const Ably = await import("ably")
        if (cancelled) return

        realtime = new Ably.Realtime({
          authUrl: "/api/keeps/realtime-token",
          authMethod: "GET",
          authHeaders: {
            Authorization: `Bearer ${syncSession.id}.${syncSession.secret}`,
          },
        })
        realtime.connection.on("connected", reconnect)
        channel = realtime.channels.get(`private:keeps:${syncSession.id}`)
        await channel.subscribe("changed", receiveChange)
        publicChannel = realtime.channels.get("public:keeps")
        await publicChannel.subscribe("changed", receivePublicChange)

        if (!cancelled) {
          setSyncStatus("Saved Keeps are syncing live.")
          trackKeepsEvent("keeps_realtime", { outcome: "connected" })
        }
      } catch {
        if (!cancelled) {
          setSyncStatus("Saved Keeps will sync when the connection returns.")
          trackKeepsEvent("keeps_realtime", { outcome: "connection_failed" })
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      channel?.unsubscribe("changed", receiveChange)
      publicChannel?.unsubscribe("changed", receivePublicChange)
      realtime?.connection.off("connected", reconnect)
      realtime?.close()
    }
  }, [refreshPublicKeeps, syncCollection, syncSession])

  useEffect(() => {
    if (syncSession) return

    let realtime: import("ably").Realtime | undefined
    let channel: import("ably").RealtimeChannel | undefined
    let cancelled = false
    const receiveChange = () => void refreshPublicKeeps()

    const connect = async () => {
      try {
        const Ably = await import("ably")
        if (cancelled) return

        realtime = new Ably.Realtime({
          authUrl: "/api/keeps/public-realtime-token",
          authMethod: "GET",
        })
        channel = realtime.channels.get("public:keeps")
        await channel.subscribe("changed", receiveChange)
        if (!cancelled) {
          trackKeepsEvent("keeps_realtime", {
            outcome: "public_feed_connected",
          })
        }
      } catch {
        if (!cancelled) {
          trackKeepsEvent("keeps_realtime", {
            outcome: "public_feed_connection_failed",
          })
        }
      }
    }

    void connect()

    return () => {
      cancelled = true
      channel?.unsubscribe("changed", receiveChange)
      realtime?.close()
    }
  }, [refreshPublicKeeps, syncSession])

  const toggleSaved = (keep: Keep) => {
    setSavedKeepIds((current) => {
      const next = current.includes(keep.id)
        ? current.filter((id) => id !== keep.id)
        : [...current, keep.id]
      storeFavouriteIds(next)

      if (syncSession) {
        queueSyncChange(
          { keepId: keep.id, saved: next.includes(keep.id) },
          syncSession
        )
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

  const shuffledKeeps = useMemo(
    () =>
      [...keeps].sort(
        (first, second) =>
          seededOrder(`${shuffleSeed}:${first.id}`) -
          seededOrder(`${shuffleSeed}:${second.id}`)
      ),
    [keeps, shuffleSeed]
  )
  const tags = useMemo(() => {
    const allowedTags = new Set<string>(keepTagTaxonomy)
    const tagCounts = new Map<string, number>()
    for (const tag of keeps.flatMap((keep) => keep.tags)) {
      if (!allowedTags.has(tag)) continue
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1)
    }

    const topicTags = [...tagCounts]
      .sort(
        ([firstTag, firstCount], [secondTag, secondCount]) =>
          secondCount - firstCount || firstTag.localeCompare(secondTag)
      )
      .slice(0, 12)
      .map(([tag]) => tag)

    return ["All", "Saved Keeps", "Latest", ...topicTags]
  }, [keeps])
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
      <PageBackLink className="mb-7" />
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

        {shareStatus ? (
          <p
            role="status"
            className="rounded-lg bg-muted px-3 py-2 text-xs leading-5 text-muted-foreground"
          >
            {shareStatus}
          </p>
        ) : null}

        <div className="flex min-w-0 flex-col border-b border-border">
          <label className="block w-full">
            <span className="sr-only">Search Keeps</span>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search Keeps…"
              className="h-10 rounded-none border-0 border-b px-0 py-2 text-sm font-normal shadow-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-0 md:text-sm dark:bg-transparent"
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
                  className="inline-flex shrink-0 items-start gap-1 rounded-sm text-xs no-underline transition-colors hover:text-foreground hover:no-underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none aria-pressed:font-semibold aria-pressed:text-foreground md:text-sm"
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
