import { listKeeps } from "@/lib/keeps/db"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const encoder = new TextEncoder()

export async function GET(request: Request) {
  let interval: ReturnType<typeof setInterval> | undefined
  let timeout: ReturnType<typeof setTimeout> | undefined
  let closed = false
  let previous = ""

  const stream = new ReadableStream({
    start(controller) {
      const close = () => {
        if (closed) return
        closed = true
        if (interval) clearInterval(interval)
        if (timeout) clearTimeout(timeout)
        try {
          controller.close()
        } catch {
          // The browser may already have closed the connection.
        }
      }

      const publish = async () => {
        if (closed) return

        try {
          const keeps = await listKeeps()
          const next = JSON.stringify(keeps)
          if (next === previous) return

          previous = next
          controller.enqueue(
            encoder.encode(
              `event: keeps\ndata: ${JSON.stringify({ keeps })}\n\n`
            )
          )
        } catch {
          controller.enqueue(
            encoder.encode(": database temporarily unavailable\n\n")
          )
        }
      }

      void publish()
      interval = setInterval(() => void publish(), 2_000)
      timeout = setTimeout(close, 55_000)
      request.signal.addEventListener("abort", close, { once: true })
    },
    cancel() {
      closed = true
      if (interval) clearInterval(interval)
      if (timeout) clearTimeout(timeout)
    },
  })

  return new Response(stream, {
    headers: {
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Content-Type": "text/event-stream; charset=utf-8",
      "X-Accel-Buffering": "no",
    },
  })
}
