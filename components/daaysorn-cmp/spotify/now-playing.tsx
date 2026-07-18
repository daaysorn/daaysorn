"use client"

import * as React from "react"
import useSWR from "swr"

import { cn } from "@/lib/utils"

import { NowPlayingWidget } from "./now-playing-widget"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "./ui/dialog"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "./ui/hover-card"
import { PROVIDERS } from "./providers"
import type { NowPlayingResult, Track } from "./types"

/** Poll fast while a track is actively playing, slower when idle (ms). */
const PLAYING_INTERVAL = 15_000
const IDLE_INTERVAL = 60_000

const fetcher = async (url: string): Promise<NowPlayingResult> => {
  const res = await fetch(url)
  if (!res.ok) return { status: "empty" }
  return (await res.json()) as NowPlayingResult
}

export function NowPlaying({ className }: { className?: string }) {
  const { data: result } = useSWR<NowPlayingResult>(
    "/api/now-playing",
    fetcher,
    {
      // Live playback: poll quickly while playing so a pause/skip reflects fast.
      refreshInterval: (latest) =>
        latest?.status === "ok" && latest.track.isPlaying
          ? PLAYING_INTERVAL
          : IDLE_INTERVAL,
      refreshWhenHidden: false,
      revalidateOnFocus: true, // returning to the tab refetches immediately
      revalidateOnReconnect: true,
      dedupingInterval: 10_000,
      keepPreviousData: true, // no flash back to the skeleton on refetch
    }
  )

  // Loading: subtle shimmer so the footer doesn't jump.
  if (!result) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        <span className="inline-block h-3 w-40 animate-pulse rounded bg-muted align-middle" />
      </p>
    )
  }

  if (result.status === "unconfigured") {
    const Icon = PROVIDERS.spotify.icon
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          className
        )}
      >
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="block max-w-[220px] truncate">
          <span className="font-semibold text-primary">Song Name</span> by
          Artist Name
        </span>
      </span>
    )
  }

  if (result.status === "empty") {
    const Icon = PROVIDERS.spotify.icon
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 text-sm text-muted-foreground",
          className
        )}
      >
        <Icon aria-hidden className="size-3.5 shrink-0 text-muted-foreground" />
        Nothing playing right now
      </span>
    )
  }

  return <NowPlayingLine track={result.track} className={className} />
}

function NowPlayingLine({
  track,
  className,
}: {
  track: Track
  className?: string
}) {
  const [open, setOpen] = React.useState(false)
  const meta = PROVIDERS[track.provider]
  const Icon = meta.icon

  return (
    <>
      {/* Hovering anywhere on the line shows the compact preview widget. */}
      <HoverCard openDelay={120} closeDelay={120}>
        <HoverCardTrigger asChild>
          <span
            className={cn(
              "inline-flex max-w-full min-w-0 items-center gap-1.5 text-sm text-muted-foreground",
              className
            )}
          >
            {/* While playing: logo pulses first, then the title picks up the
                pulse (delayed), and the artist shimmers. Static grey otherwise.
                Clicking the song opens the modal. */}
            <Icon
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground",
                track.isPlaying && "motion-safe:animate-music-pulse"
              )}
              style={track.isPlaying ? { color: meta.brandColor } : undefined}
            />
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-w-0 rounded-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="block max-w-[220px] truncate">
                <span
                  className={cn(
                    "font-semibold text-primary hover:underline",
                    track.isPlaying &&
                      "motion-safe:animate-music-pulse motion-safe:[animation-delay:0.6s]"
                  )}
                >
                  {track.title}
                </span>{" "}
                by{" "}
                <span
                  className={cn(
                    track.isPlaying && "motion-safe:animate-text-shimmer"
                  )}
                >
                  {track.artist}
                </span>
              </span>
            </button>
          </span>
        </HoverCardTrigger>

        <HoverCardContent
          side="top"
          align="start"
          className="w-auto border-0 bg-transparent p-0 shadow-none"
        >
          <NowPlayingWidget track={track} showCaption />
        </HoverCardContent>
      </HoverCard>

      {/* Centered, non-dismissible modal (no backdrop-click / Esc close). */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="flex items-center gap-2 pr-8">
            <Icon
              aria-hidden
              className={cn(
                "size-5 shrink-0 text-muted-foreground",
                track.isPlaying && "motion-safe:animate-music-pulse"
              )}
              style={track.isPlaying ? { color: meta.brandColor } : undefined}
            />
            <div className="min-w-0">
              <DialogTitle className="truncate">{track.title}</DialogTitle>
              <DialogDescription className="truncate">
                {track.artist}
              </DialogDescription>
            </div>
          </div>

          <NowPlayingWidget
            track={track}
            className="w-full max-w-none border-0 bg-transparent p-0 shadow-none ring-0 backdrop-blur-none"
          />

          {track.songUrl && (
            <a
              href={track.songUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-border/60 bg-background/40 px-4 py-2 text-sm font-medium text-foreground transition-colors outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon
                aria-hidden
                className="size-4"
                style={{ color: meta.brandColor }}
              />
              Open in {meta.label}
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
