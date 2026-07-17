import type { IconType } from "react-icons"
import { SiApplemusic, SiSpotify, SiYoutubemusic } from "react-icons/si"

import type { Provider } from "./types"

interface ProviderMeta {
  label: string
  icon: IconType
  /**
   * Official brand color for the logo glyph. Deliberate exception to the
   * "semantic tokens only" rule — kept isolated to the provider icon.
   */
  brandColor: string
  /** Height of the embed iframe, tuned per provider's player chrome. */
  embedHeight: number
}

export const PROVIDERS: Record<Provider, ProviderMeta> = {
  spotify: {
    label: "Spotify",
    icon: SiSpotify,
    brandColor: "#1DB954",
    embedHeight: 152,
  },
  apple: {
    label: "Apple Music",
    icon: SiApplemusic,
    brandColor: "#FA243C",
    embedHeight: 175,
  },
  youtube: {
    label: "YouTube Music",
    icon: SiYoutubemusic,
    brandColor: "#FF0000",
    embedHeight: 152,
  },
}

/**
 * Build an embed iframe URL from a track/video id for any provider. Handy for
 * config-driven tracks; the live Spotify path already supplies `embedUrl`.
 */
export function buildEmbedUrl(provider: Provider, id: string): string {
  switch (provider) {
    case "spotify":
      return `https://open.spotify.com/embed/track/${id}?utm_source=generator`
    case "apple":
      // `id` is expected as "<storefront>/<album-slug>/<albumId>?i=<songId>".
      return `https://embed.music.apple.com/${id}`
    case "youtube":
      return `https://www.youtube.com/embed/${id}`
  }
}
