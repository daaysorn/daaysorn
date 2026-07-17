/** Streaming services whose embed widgets we can render. */
export type Provider = "spotify" | "apple" | "youtube"

/** A normalized track, provider-agnostic on the surface. */
export interface Track {
  provider: Provider
  /** True when it's playing *right now*; false when it's the last played. */
  isPlaying: boolean
  title: string
  artist: string
  album?: string
  albumImageUrl?: string
  /** Deep link to open the track in the provider's app/site. */
  songUrl?: string
  /** iframe `src` for the provider's embed player. */
  embedUrl?: string
}

/**
 * Result of asking a provider what's playing.
 * - `ok`           — we have a track
 * - `empty`        — configured, but nothing playing and no history
 * - `unconfigured` — credentials are missing (UI shows a graceful placeholder)
 */
export type NowPlayingResult =
  | { status: "ok"; track: Track }
  | { status: "empty" }
  | { status: "unconfigured" }
