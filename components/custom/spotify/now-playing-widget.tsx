import { cn } from "@/lib/utils"

import { PROVIDERS } from "./providers"
import type { Track } from "./types"

interface NowPlayingWidgetProps {
  track: Track
  className?: string
}

/**
 * The glassmorphism card shown inside the popover / modal: provider embed
 * player. Renders the correct iframe for the track's provider.
 */
export function NowPlayingWidget({ track, className }: NowPlayingWidgetProps) {
  const meta = PROVIDERS[track.provider]
  const Icon = meta.icon

  return (
    <div
      className={cn(
        // Glass surface: translucent popover token + blur + soft border/ring.
        "w-[320px] max-w-[80vw] overflow-hidden rounded-2xl border border-border/60 bg-popover/70 p-2 shadow-2xl ring-1 ring-inset ring-white/10 backdrop-blur-xl backdrop-saturate-150 supports-backdrop-filter:bg-popover/60",
        className,
      )}
    >
      {track.embedUrl ? (
        <iframe
          title={`${track.title} by ${track.artist} on ${meta.label}`}
          src={track.embedUrl}
          width="100%"
          height={meta.embedHeight}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full rounded-xl border-0"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <Icon
            aria-hidden
            className="size-6"
            style={{ color: meta.brandColor }}
          />
          <p className="text-sm text-muted-foreground">
            No preview available for this track.
          </p>
        </div>
      )}
    </div>
  )
}
