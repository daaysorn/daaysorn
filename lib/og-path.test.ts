import { describe, expect, test } from "bun:test"

import {
  formatOgSitePath,
  localOpenGraphImageSrc,
  normalizeAppPath,
} from "@/lib/og-path"

describe("normalizeAppPath", () => {
  test("normalizes routes and strips query or hash", () => {
    expect(normalizeAppPath("/privacy")).toBe("/privacy")
    expect(normalizeAppPath("privacy")).toBe("/privacy")
    expect(normalizeAppPath("/privacy/?x=1#top")).toBe("/privacy")
    expect(normalizeAppPath("/")).toBe("/")
    expect(normalizeAppPath("https://daaysorn.com/terms")).toBe("/terms")
  })
})

describe("formatOgSitePath", () => {
  test("builds the site path shown on page OG art", () => {
    expect(formatOgSitePath("/")).toBe("daaysorn.com")
    expect(formatOgSitePath("/privacy")).toBe("daaysorn.com/privacy")
    expect(formatOgSitePath("/rants/hello-world")).toBe(
      "daaysorn.com/rants/hello-world"
    )
  })
})

describe("localOpenGraphImageSrc", () => {
  test("maps local hrefs to generated OG image routes", () => {
    expect(localOpenGraphImageSrc("/")).toBe("/opengraph-image")
    expect(localOpenGraphImageSrc("/privacy")).toBe("/privacy/opengraph-image")
    expect(localOpenGraphImageSrc("/terms")).toBe("/terms/opengraph-image")
    expect(localOpenGraphImageSrc("/gallery")).toBe("/gallery/opengraph-image")
    expect(localOpenGraphImageSrc("/rants/some-slug")).toBe(
      "/rants/some-slug/opengraph-image"
    )
  })
})
