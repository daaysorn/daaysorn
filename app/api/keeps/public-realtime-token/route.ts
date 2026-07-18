import { createPublicKeepsRealtimeToken } from "@/lib/keeps/realtime"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return Response.json(await createPublicKeepsRealtimeToken(), {
      headers: {
        "Cache-Control":
          "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
      },
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
