import { createRantsRealtimeToken } from "@/lib/rants/realtime"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return Response.json(await createRantsRealtimeToken(), {
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
