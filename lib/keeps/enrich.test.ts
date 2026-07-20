import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { isXIdentityTitle, sourceMetadataFallback } from "@/lib/keeps/enrich"

describe("sourceMetadataFallback", () => {
  test("keeps a normal page when AI review rejects its drafts", () => {
    assert.deepEqual(
      sourceMetadataFallback({
        href: "https://ussdk.me/",
        title: "Welcome to USSDK",
        description:
          "Build USSD applications in hours, not weeks. Visually compose an application using a familiar drag-and-drop experience.",
        body: "",
        ownerNote: "",
      }),
      {
        title: "Welcome to USSDK",
        summary:
          "Build USSD applications in hours, not weeks. Visually compose an application using a familiar drag-and-drop experience.",
      }
    )
  })

  test("prefers a trusted owner note over page copy", () => {
    assert.equal(
      sourceMetadataFallback({
        href: "https://example.com/resource",
        title: "Resource",
        description: "Page description.",
        body: "Page body.",
        ownerNote: "My reason for saving this.",
      }).summary,
      "My reason for saving this."
    )
  })

  test("replaces X profile boilerplate with the post context", () => {
    assert.deepEqual(
      sourceMetadataFallback({
        href: "https://x.com/i/status/123456789",
        title: "TERO (@TERO1X_) on X",
        description: "Lego Dump 👾",
        body: "Lego Dump 👾",
        ownerNote: "",
      }),
      {
        title: "Lego Dump",
        summary: "Lego Dump 👾",
      }
    )
  })
})

describe("isXIdentityTitle", () => {
  test("detects X username boilerplate without rejecting editorial titles", () => {
    assert.equal(isXIdentityTitle("TERO (@TERO1X_) on X"), true)
    assert.equal(isXIdentityTitle("@TERO1X_ on X"), true)
    assert.equal(isXIdentityTitle("A Lego Character Dump"), false)
  })
})
