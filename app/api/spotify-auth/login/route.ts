import { NextResponse } from "next/server"

// One-time helper to mint a Spotify refresh token. Dev-only.
export const dynamic = "force-dynamic"

const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
].join(" ")

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Disabled in production.", { status: 403 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return new NextResponse(
      "Missing SPOTIFY_CLIENT_ID in .env.local — add it and restart the dev server.",
      { status: 500 },
    )
  }

  // Pinned so it exactly matches the dashboard. Spotify requires 127.0.0.1
  // (not localhost) for loopback, and the dev server's origin can't be trusted.
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    "http://127.0.0.1:3000/api/spotify-auth/callback"
  const state = crypto.randomUUID()

  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", SCOPES)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const res = NextResponse.redirect(authUrl.toString())
  // Round-trip the state through an httpOnly cookie for basic CSRF protection.
  res.cookies.set("spotify_auth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
  return res
}
