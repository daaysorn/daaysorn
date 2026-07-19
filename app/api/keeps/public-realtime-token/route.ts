import { createPublicKeepsRealtimeToken } from "@/lib/keeps/realtime"
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit"

export const dynamic = "force-dynamic"

export async function GET(request: Request) {
  const limit = rateLimit(request, {
    key: "public-realtime-token",
    limit: 30,
    windowMs: 60 * 1000,
  })
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter)

  try {
    return Response.json(await createPublicKeepsRealtimeToken(), {
      headers: { "Cache-Control": "private, no-store" },
    })
  } catch (error) {
    const isMissingKey =
      error instanceof Error && error.message.includes("ABLY_API_KEY")
    return Response.json(
      {
        error: isMissingKey
          ? "Realtime is not configured"
          : "Realtime token failed",
      },
      { status: isMissingKey ? 503 : 500 }
    )
  }
}
