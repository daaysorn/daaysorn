/**
 * Server-only Spotify Web API helpers.
 *
 * Reads a long-lived refresh token from the environment and exchanges it for a
 * short-lived access token on each request, then reports what's currently
 * playing (falling back to the most recently played track).
 *
 * Required env (see .env.local):
 *   SPOTIFY_CLIENT_ID
 *   SPOTIFY_CLIENT_SECRET
 *   SPOTIFY_REFRESH_TOKEN
 *
 * Server-only: imported exclusively by the /api/now-playing route handler.
 */
import type { NowPlayingResult, Track } from "@/components/daaysorn-cmp/spotify/types"

const TOKEN_ENDPOINT = "https://accounts.spotify.com/api/token"
const NOW_PLAYING_ENDPOINT =
  "https://api.spotify.com/v1/me/player/currently-playing"
const RECENTLY_PLAYED_ENDPOINT =
  "https://api.spotify.com/v1/me/player/recently-played?limit=1"

const isConfigured = () =>
  Boolean(
    process.env.SPOTIFY_CLIENT_ID &&
      process.env.SPOTIFY_CLIENT_SECRET &&
      process.env.SPOTIFY_REFRESH_TOKEN,
  )

async function getAccessToken(): Promise<string | null> {
  const basic = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`,
  ).toString("base64")

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN as string,
    }),
    cache: "no-store",
  })

  if (!res.ok) return null
  const data = (await res.json()) as { access_token?: string }
  return data.access_token ?? null
}

/** Shape of the bits we read off a Spotify track object. */
interface SpotifyTrackItem {
  name: string
  artists: { name: string }[]
  album?: { name?: string; images?: { url: string }[] }
  external_urls?: { spotify?: string }
  id: string
}

function toTrack(item: SpotifyTrackItem, isPlaying: boolean): Track {
  return {
    provider: "spotify",
    isPlaying,
    title: item.name,
    artist: item.artists.map((a) => a.name).join(", "),
    album: item.album?.name,
    albumImageUrl: item.album?.images?.[0]?.url,
    songUrl: item.external_urls?.spotify,
    embedUrl: `https://open.spotify.com/embed/track/${item.id}?utm_source=generator`,
  }
}

/**
 * Returns the currently playing track, or the most recently played one, or an
 * `empty`/`unconfigured` status. Never throws — network/auth failures resolve
 * to `{ status: "empty" }` so the UI degrades gracefully.
 */
export async function getNowPlaying(): Promise<NowPlayingResult> {
  if (!isConfigured()) return { status: "unconfigured" }

  try {
    const accessToken = await getAccessToken()
    if (!accessToken) return { status: "empty" }

    const headers = { Authorization: `Bearer ${accessToken}` }

    // 1) What's playing right now (204 = nothing playing).
    const nowRes = await fetch(NOW_PLAYING_ENDPOINT, {
      headers,
      cache: "no-store",
    })

    if (nowRes.status === 200) {
      const data = (await nowRes.json()) as {
        is_playing: boolean
        item: SpotifyTrackItem | null
      }
      if (data.item) {
        return { status: "ok", track: toTrack(data.item, data.is_playing) }
      }
    }

    // 2) Fall back to the last played track.
    const recentRes = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers,
      cache: "no-store",
    })
    if (recentRes.ok) {
      const data = (await recentRes.json()) as {
        items: { track: SpotifyTrackItem }[]
      }
      const item = data.items?.[0]?.track
      if (item) return { status: "ok", track: toTrack(item, false) }
    }

    return { status: "empty" }
  } catch {
    return { status: "empty" }
  }
}
