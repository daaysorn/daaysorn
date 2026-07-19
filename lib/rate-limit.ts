type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

function clientAddress(request: Request) {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  )
}

export function rateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now()
  const bucketKey = `${options.key}:${clientAddress(request)}`
  const current = buckets.get(bucketKey)
  const bucket =
    !current || current.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : current

  bucket.count += 1
  buckets.set(bucketKey, bucket)

  if (buckets.size > 2_000) {
    for (const [key, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(key)
    }
  }

  return {
    allowed: bucket.count <= options.limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1_000)),
  }
}

export function rateLimitResponse(retryAfter: number) {
  return Response.json(
    { error: "Too many requests. Please try again shortly." },
    {
      status: 429,
      headers: {
        "Cache-Control": "private, no-store",
        "Retry-After": String(retryAfter),
      },
    }
  )
}
