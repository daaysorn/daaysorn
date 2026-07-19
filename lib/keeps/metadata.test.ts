import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  hasVerifiedInstagramContext,
  instagramResourceFromUrl,
  isGenericKeepCopy,
  isInstagramAuthUrl,
  originalKeepHref,
} from "@/lib/keeps/metadata"

describe("hasVerifiedInstagramContext", () => {
  test("rejects a generic shell without a usable thumbnail", () => {
    assert.equal(
      hasVerifiedInstagramContext({
        ownerNote: "",
        thumbnailAnalysis: "",
        title: "Instagram Reel Link",
        description:
          "This is a saved link to an Instagram reel. For complete details and context, refer to the original source.",
      }),
      false
    )
  })

  test("accepts recovered thumbnail evidence", () => {
    assert.equal(
      hasVerifiedInstagramContext({
        ownerNote: "",
        thumbnailAnalysis: "A sign reads AI ads vs Reality.",
        title: "Instagram Reel Link",
        description: "",
      }),
      true
    )
  })
})

describe("isGenericKeepCopy", () => {
  test("rejects vague visual filler", () => {
    assert.equal(
      isGenericKeepCopy(
        "Impressive Visuals",
        "This reel showcases stunning visuals that are truly captivating."
      ),
      true
    )
  })

  test("allows a factual thumbnail description", () => {
    assert.equal(
      isGenericKeepCopy(
        "A Monitor and Laptop Display Setup",
        "A creator holds a monitor showing the same car image as a nearby laptop."
      ),
      false
    )
  })
})

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
