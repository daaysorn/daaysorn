import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  instagramResourceFromUrl,
  isInstagramAuthUrl,
  originalKeepHref,
} from "@/lib/keeps/metadata"

describe("instagramResourceFromUrl", () => {
  test("distinguishes reels from profiles", () => {
    assert.deepEqual(
      instagramResourceFromUrl("https://instagram.com/reel/DaO4tSipGK4"),
      { kind: "reel", handle: null }
    )
    assert.deepEqual(
      instagramResourceFromUrl("https://instagram.com/malcolmjosephatdesigns"),
      { kind: "profile", handle: "malcolmjosephatdesigns" }
    )
  })
})

describe("Instagram auth redirects", () => {
  test("recognizes login and signup walls", () => {
    assert.equal(
      isInstagramAuthUrl("https://instagram.com/accounts/login?next=%2Freel"),
      true
    )
    assert.equal(
      isInstagramAuthUrl("https://instagram.com/reel/DaO4tSipGK4"),
      false
    )
  })

  test("recovers the submitted profile from Telegram text", () => {
    assert.equal(
      originalKeepHref(
        "https://instagram.com/accounts/login",
        "https://www.instagram.com/malcolmjosephatdesigns?igsh=tracking"
      ),
      "https://www.instagram.com/malcolmjosephatdesigns?igsh=tracking"
    )
  })
})
