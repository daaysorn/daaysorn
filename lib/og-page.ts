import { ogSize, renderPageOgImage, type PageOgOptions } from "@/lib/og-image"
import { siteConfig } from "@/lib/seo"

export type PageOgConfig = {
  title: string
  /**
   * One-line supporting copy for the PageLightSwiss OG template.
   * Keep it short (roughly ≤72 characters) so it never wraps.
   */
  description: string
  /** App route pathname, e.g. `/privacy` or `privacy`. */
  path: string
  labels?: string[]
  /** Defaults to `{title} | daaysorn`. */
  alt?: string
}

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
 * New static pages only need `app/<route>/opengraph-image.tsx` (via
 * {@link createPageOgImage}); previews and social cards pick them up
 * automatically.
 */
export function localOpenGraphImageSrc(href: string) {
  const pathname = normalizeAppPath(href)
  return pathname === "/"
    ? "/opengraph-image"
    : `${pathname}/opengraph-image`
}

/**
 * Standard page OG module exports for the PageLightSwiss template.
 *
 * @example
 * ```tsx
 * // app/privacy/opengraph-image.tsx
 * import { createPageOgImage } from "@/lib/og-page"
 *
 * const og = createPageOgImage({
 *   title: "Privacy Policy",
 *   description: "…",
 *   path: "/privacy",
 *   labels: ["Legal", "Privacy"],
 * })
 *
 * export const alt = og.alt
 * export const size = og.size
 * export const contentType = og.contentType
 * export default og.Image
 * ```
 */
export function createPageOgImage(config: PageOgConfig) {
  const options: PageOgOptions = {
    title: config.title,
    description: config.description,
    path: formatOgSitePath(config.path),
    labels: config.labels,
  }

  return {
    alt: config.alt ?? `${config.title} | ${siteConfig.name}`,
    size: ogSize,
    contentType: "image/png" as const,
    Image: function PageOpenGraphImage() {
      return renderPageOgImage(options)
    },
  }
}
