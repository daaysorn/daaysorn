import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { normalizeKeepUrl } from "@/lib/keeps/url"

describe("normalizeKeepUrl", () => {
  test("matches X share and author status URLs by status ID", () => {
    const shareUrl = normalizeKeepUrl(
      "https://x.com/i/status/2078533887383556335"
    )
    const authorUrl = normalizeKeepUrl(
      "https://x.com/RohOnChain/status/2078533887383556335?s=20"
    )

    assert.equal(authorUrl, shareUrl)
    assert.equal(shareUrl, "https://x.com/i/status/2078533887383556335")
  })

  test("matches legacy Twitter status URLs", () => {
    assert.equal(
      normalizeKeepUrl(
        "https://twitter.com/RohOnChain/status/2078533887383556335"
      ),
      "https://x.com/i/status/2078533887383556335"
    )
  })
})
