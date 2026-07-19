import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { isChallengeContent } from "@/lib/keeps/fallback"

describe("isChallengeContent", () => {
  test("detects the Dribbble JavaScript challenge copy", () => {
    assert.equal(
      isChallengeContent(
        "JavaScript Verification Notice",
        "This message indicates that JavaScript is disabled, preventing access to content. Users need to enable JavaScript and reload the page for verification."
      ),
      true
    )
  })

  test("does not reject normal editorial content", () => {
    assert.equal(
      isChallengeContent(
        "A Better Checkout Experience",
        "A product design exploring a simpler payment flow."
      ),
      false
    )
  })
})
