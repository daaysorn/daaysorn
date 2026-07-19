import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { sourceMetadataFallback } from "@/lib/keeps/enrich"

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
})
