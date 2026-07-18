import { getNowPlaying } from "@/components/daaysorn-cmp/spotify/server"

// Always run at request time — this reflects live playback state.
export const dynamic = "force-dynamic"

export async function GET() {
  const result = await getNowPlaying()

  return Response.json(result, {
    // Browsers revalidate, while Vercel's edge shares one short-lived Spotify
    // response across visitors instead of invoking this function per person.
    headers: {
      "Cache-Control":
        "public, max-age=0, s-maxage=10, stale-while-revalidate=20",
    },
  })
}
