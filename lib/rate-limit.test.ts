import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { rateLimit } from "@/lib/rate-limit"

describe("rateLimit", () => {
  test("allows requests through the configured limit", () => {
    const request = new Request("https://daaysorn.com/api/test", {
      headers: { "x-forwarded-for": "203.0.113.10" },
    })
    const key = `test-allow-${crypto.randomUUID()}`

    assert.equal(
      rateLimit(request, { key, limit: 2, windowMs: 60_000 }).allowed,
      true
    )
    assert.equal(
      rateLimit(request, { key, limit: 2, windowMs: 60_000 }).allowed,
      true
    )
  })

  test("rejects requests above the configured limit", () => {
    const request = new Request("https://daaysorn.com/api/test", {
      headers: { "x-forwarded-for": "203.0.113.11" },
    })
    const key = `test-reject-${crypto.randomUUID()}`

    rateLimit(request, { key, limit: 1, windowMs: 60_000 })
    const result = rateLimit(request, { key, limit: 1, windowMs: 60_000 })

    assert.equal(result.allowed, false)
    assert.ok(result.retryAfter > 0)
  })
})
