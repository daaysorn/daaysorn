import { getNowPlaying } from "@/lib/spotify"

// Always run at request time — this reflects live playback state.
export const dynamic = "force-dynamic"

export async function GET() {
  const result = await getNowPlaying()

  return Response.json(result, {
    // Never cache — the client polls this for live playback state, so any
    // CDN/browser caching would show stale "still playing" after a pause.
    headers: { "Cache-Control": "no-store, max-age=0" },
  })
}
