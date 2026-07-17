# Spotify Now Playing

A live **"now playing / last played"** line for your footer, powered by the
Spotify Web API. Hovering the line shows a compact glassmorphism preview;
clicking the song opens a centered, non-dismissible modal with the embed player.
While a track is actively playing the logo pulses **green** and the title pulses
(the artist gets a subtle shimmer); when it's the last-played track everything is
static grey.

- Live data refreshes fast (SWR: ~5s while playing, ~20s idle) and
  **revalidates on tab focus**, so a pause/skip reflects without a manual refresh.
- Multi-provider embed support (Spotify / Apple Music / YouTube Music) is built
  in, but **live data is Spotify-only** — see [Providers](#providers).

---

## Install

```bash
# bun
bunx shadcn@latest add https://daaysorn.com/r/spotify-now-playing.json
bunx shadcn@latest add @daaysorn/spotify-now-playing   # if the namespace is configured

# npm
npx shadcn@latest add https://daaysorn.com/r/spotify-now-playing.json
```

This copies a **self-contained folder** (plus 3 thin API route shims — Next.js
requires route handlers to live under `app/`):

```
components/daaysorn-cmp/spotify/
├── now-playing.tsx          client component (the footer line)
├── now-playing-widget.tsx   the embed player card
├── providers.tsx            provider metadata (icons, brand colors, embeds)
├── types.ts                 shared types
├── server.ts                Spotify API calls (server-only)
├── auth.ts                  one-time refresh-token helper logic
├── ui/
│   ├── hover-card.tsx       glass hover preview primitive
│   └── dialog.tsx           centered modal primitive
└── index.ts                 barrel export

app/api/now-playing/route.ts             ← thin shim → server.ts
app/api/spotify-auth/login/route.ts      ← thin shim → auth.ts   (dev-only)
app/api/spotify-auth/callback/route.ts   ← thin shim → auth.ts   (dev-only)
```

Everything the component needs lives in the folder; the route files are
one-line shims that re-export from `auth.ts` / `server.ts`. Nothing is written
to your `components/ui/` or `lib/`.

Dependencies installed: `swr`, `react-icons`, `radix-ui`. CSS injected: the
`animate-text-shimmer` and `animate-music-pulse` utilities plus the
`--shimmer-base` / `--shimmer-glint` theme tokens.

---

## Usage

```tsx
import { NowPlaying } from "@/components/daaysorn-cmp/spotify"

export function Footer() {
  return (
    <footer>
      <NowPlaying />
    </footer>
  )
}
```

### Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `className` | `string` | — | Merged onto the line wrapper. |

The endpoint (`/api/now-playing`) and polling live inside the component; there's
nothing else to wire.

---

## Setup

The component renders a graceful placeholder until credentials exist, so it's
safe to ship before finishing this.

### 1. Create a Spotify app

Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
→ **Create app**. Copy the **Client ID** and **Client Secret**. In the app's
settings add this **Redirect URI** exactly (Spotify requires `127.0.0.1`, not
`localhost`, for loopback):

```
http://127.0.0.1:3000/api/spotify-auth/callback
```

### 2. Add credentials

In `.env.local`:

```bash
SPOTIFY_CLIENT_ID="..."
SPOTIFY_CLIENT_SECRET="..."
SPOTIFY_REFRESH_TOKEN=""          # filled in the next step
# Optional: override the redirect URI (must match the dashboard + your host)
# SPOTIFY_REDIRECT_URI="http://127.0.0.1:3000/api/spotify-auth/callback"
```

Restart the dev server so the vars load.

### 3. Mint a refresh token (one time)

Visit **`http://127.0.0.1:3000/api/spotify-auth/login`** → click **Agree** →
you'll land on a page showing your **refresh token** with a copy button. Paste it
into `.env.local` as `SPOTIFY_REFRESH_TOKEN` and restart.

- Refresh tokens are **long-lived** — you do this once. The server trades it for
  a short-lived access token on every request.
- The `app/api/spotify-auth/` routes are **dev-only** (403 in production). Once
  you have the token you can delete that folder.

### 4. Production

Set `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN` in your
host's environment (they're server-only — no `NEXT_PUBLIC_`). No redirect URI is
needed in production; it's only for minting the token locally.

---

## Providers

The embed widget and brand styling support all three services, but live
now-playing data does not:

| Provider | Live data? | Why |
|----------|-----------|-----|
| **Spotify** | ✅ | Official Web API (`/me/player/currently-playing`). |
| **Apple Music** | ⚠️ | Needs MusicKit + a per-user token generated in-browser; no simple server refresh-token flow. |
| **YouTube Music** | ❌ | No official now-playing API. |

So the live line always shows your **Spotify** track. The Apple/YouTube code
paths exist for a manually configured ("pinned") track.

---

## How it works

- `spotify/server.ts` (server-only) refreshes an access token, then reads
  `currently-playing`, falling back to `recently-played`. It never throws —
  failures degrade to an empty state.
- `app/api/now-playing/route.ts` is a thin `force-dynamic` +
  `Cache-Control: no-store` shim over `server.ts`, so playback state is always
  fresh (no CDN staleness).
- `now-playing.tsx` fetches with **SWR**: adaptive `refreshInterval`,
  `revalidateOnFocus`, `keepPreviousData`.

### Customization

- **Polling speed** — `PLAYING_INTERVAL` / `IDLE_INTERVAL` at the top of
  `now-playing.tsx`.
- **Brand colors** — `PROVIDERS` in `providers.tsx`.
- **Shimmer/pulse** — the `--shimmer-*` tokens and `animate-*` utilities in
  `globals.css`.
- **Truncation width** — `max-w-[220px]` on the title span.

Animations are gated behind `motion-safe:`, so reduced-motion users get a static
line.
