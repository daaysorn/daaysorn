import { authenticateKeepsSyncGroup } from "@/lib/keeps/sync-db"
import { createKeepsRealtimeToken } from "@/lib/keeps/realtime"

export const dynamic = "force-dynamic"

function credentials(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  const [id, secret] = authorization.slice(7).split(".", 2)
  return id && secret ? { id, secret } : null
}

export async function GET(request: Request) {
  try {
    const auth = credentials(request)
    if (!auth || !(await authenticateKeepsSyncGroup(auth.id, auth.secret))) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    return Response.json(await createKeepsRealtimeToken(auth.id), {
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
