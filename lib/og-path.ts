import { siteConfig } from "@/lib/seo"

function siteHost() {
  try {
    return new URL(siteConfig.url).host
  } catch {
    return "daaysorn.com"
  }
}

/** Normalize a route or href to a leading-slash pathname without query/hash. */
export function normalizeAppPath(href: string) {
  const trimmed = href.trim()
  if (!trimmed || trimmed === "/") return "/"

  const withoutOrigin = trimmed.replace(/^https?:\/\/[^/]+/i, "")
  const pathOnly = withoutOrigin.split(/[?#]/, 1)[0] ?? "/"
  const withSlash = pathOnly.startsWith("/") ? pathOnly : `/${pathOnly}`
  const collapsed = withSlash.replace(/\/{2,}/g, "/")
  if (collapsed.length > 1 && collapsed.endsWith("/")) {
    return collapsed.slice(0, -1)
  }
  return collapsed || "/"
}

/**
 * Path shown on the PageLightSwiss OG template
 * (e.g. `/privacy` → `daaysorn.com/privacy`).
 */
export function formatOgSitePath(path: string) {
  const pathname = normalizeAppPath(path)
  const host = siteHost()
  return pathname === "/" ? host : `${host}${pathname}`
}

/**
 * Resolve a local app href to its generated Next.js OG image route.
 * `/privacy` → `/privacy/opengraph-image`
 * `/` → `/opengraph-image`
 *
 * Safe for Client Components. Do not import `@/lib/og-page` or `@/lib/og-image`
 * from client code — those pull in `next/og` / Node APIs.
 */
export function localOpenGraphImageSrc(href: string) {
  const pathname = normalizeAppPath(href)
  return pathname === "/"
    ? "/opengraph-image"
    : `${pathname}/opengraph-image`
}
