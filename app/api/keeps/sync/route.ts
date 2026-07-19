import {
  applyKeepsSyncChanges,
  authenticateKeepsSyncGroup,
  createKeepsSyncGroup,
  getKeepsSyncDisplayName,
  listSyncedKeepIds,
} from "@/lib/keeps/sync-db"
import { publishKeepsChanged } from "@/lib/keeps/realtime"

export const dynamic = "force-dynamic"

const headers = { "Cache-Control": "private, no-store" }

function validIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return [
    ...new Set(
      value.filter(
        (id): id is string => typeof id === "string" && id.length <= 100
      )
    ),
  ].slice(0, 500)
}

function credentials(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  const [id, secret] = authorization.slice(7).split(".", 2)
  return id && secret ? { id, secret } : null
}

async function authorize(request: Request) {
  const auth = credentials(request)
  if (!auth || !(await authenticateKeepsSyncGroup(auth.id, auth.secret))) {
    return null
  }
  return auth
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { savedIds?: unknown }
    const session = await createKeepsSyncGroup(validIds(body.savedIds))
    return Response.json(session, { status: 201, headers })
  } catch {
    return Response.json(
      { error: "Sync could not be created" },
      { status: 503, headers }
    )
  }
}

export async function GET(request: Request) {
  try {
    const auth = await authorize(request)
    if (!auth)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers })
    return Response.json(
      {
        savedIds: await listSyncedKeepIds(auth.id),
        displayName: await getKeepsSyncDisplayName(auth.id),
      },
      { headers }
    )
  } catch {
    return Response.json(
      { error: "Sync is unavailable" },
      { status: 503, headers }
    )
  }
}

export async function PATCH(request: Request) {
  try {
    const auth = await authorize(request)
    if (!auth)
      return Response.json({ error: "Unauthorized" }, { status: 401, headers })
    const body = (await request.json()) as { changes?: unknown }
    const changes = Array.isArray(body.changes)
      ? body.changes
          .filter(
            (change): change is { keepId: string; saved: boolean } =>
              typeof change === "object" &&
              change !== null &&
              typeof change.keepId === "string" &&
              change.keepId.length <= 100 &&
              typeof change.saved === "boolean"
          )
          .slice(0, 100)
      : []
    await applyKeepsSyncChanges(auth.id, changes)
    try {
      await publishKeepsChanged(auth.id)
    } catch (error) {
      console.error("Saved Keeps realtime publish failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      })
    }
    return Response.json(
      { savedIds: await listSyncedKeepIds(auth.id) },
      { headers }
    )
  } catch {
    return Response.json(
      { error: "Changes could not be synced" },
      { status: 503, headers }
    )
  }
}
