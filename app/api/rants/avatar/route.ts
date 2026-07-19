import * as adventurer from "@dicebear/adventurer"
import { createAvatar } from "@dicebear/core"
import { NextResponse } from "next/server"

import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

const CACHE_CONTROL =
  "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=604800"
const BACKGROUNDS = ["b6e3f4", "c0aede", "d1d4f9", "ffd5dc", "ffdfbf"]

function avatarResponse(svg: string) {
  return new NextResponse(svg, {
    headers: {
      "Cache-Control": CACHE_CONTROL,
      "Content-Type": "image/svg+xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  })
}

function fallbackAvatar(seed: string) {
  const initials =
    seed
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("")
      .replace(/[^A-Z0-9]/g, "") || "D"
  const hash = [...seed].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0
  )
  const background = BACKGROUNDS[hash % BACKGROUNDS.length]

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="${initials}"><circle cx="32" cy="32" r="32" fill="#${background}"/><text x="32" y="38" fill="#172033" font-family="system-ui,sans-serif" font-size="22" font-weight="700" text-anchor="middle">${initials}</text></svg>`
}

export async function GET(request: Request) {
  const limit = rateLimit(request, {
    key: "rant-avatar",
    limit: 60,
    windowMs: 60 * 1000,
  })
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter)

  const seed =
    new URL(request.url).searchParams.get("seed")?.trim().slice(0, 80) ||
    "daaysorn-reader"

  try {
    return avatarResponse(
      createAvatar(adventurer, {
        seed,
        backgroundColor: BACKGROUNDS,
        radius: 50,
      }).toString()
    )
  } catch {
    return avatarResponse(fallbackAvatar(seed))
  }
}
