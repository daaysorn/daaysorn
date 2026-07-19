import { listKeeps } from "@/lib/keeps/db"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    return Response.json(
      { keeps: await listKeeps() },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch {
    return Response.json({ keeps: [] }, { status: 503 })
  }
}
