import { ogSize, renderPageOgImage, type PageOgOptions } from "@/lib/og-image"
import { formatOgSitePath } from "@/lib/og-path"
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

/**
 * Standard page OG module exports for the PageLightSwiss template.
 * Server-only — used from `opengraph-image.tsx` / `twitter-image.tsx`.
 *
 * Client code that only needs preview URLs should import
 * `localOpenGraphImageSrc` from `@/lib/og-path` instead.
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
