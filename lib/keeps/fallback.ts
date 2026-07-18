const challengePhrases = [
  "verify javascript for access",
  "enable javascript in your browser",
  "browser settings",
  "checking your browser",
  "just a moment",
]

export function sourceFromKeepUrl(href: string) {
  const host = new URL(href).hostname.replace(/^www\./, "")
  if (host === "x.com" || host === "twitter.com") return "X"
  if (host === "behance.net") return "Behance"
  if (host === "dribbble.com") return "Dribbble"
  if (host === "facebook.com") return "Facebook"
  if (host === "github.com") return "GitHub"
  if (host === "instagram.com") return "Instagram"
  if (host === "linkedin.com") return "LinkedIn"
  if (host === "open.spotify.com") return "Spotify"
  if (host === "reddit.com") return "Reddit"
  if (host === "soundcloud.com") return "SoundCloud"
  if (host === "threads.net") return "Threads"
  if (host === "vimeo.com") return "Vimeo"
  if (host === "youtube.com" || host === "youtu.be") return "YouTube"
  if (host === "tiktok.com") return "TikTok"
  return "Article"
}

export function isChallengeContent(
  ...values: Array<string | null | undefined>
) {
  const content = values.filter(Boolean).join(" ").toLowerCase()
  return challengePhrases.some((phrase) => content.includes(phrase))
}

export function titleFromKeepUrl(href: string) {
  const url = new URL(href)
  const rawSlug = decodeURIComponent(
    url.pathname.split("/").filter(Boolean).at(-1) ?? url.hostname
  )
    .replace(/^\d+[-_]?/, "")
    .replace(/[-_]+/g, " ")
    .trim()

  if (!rawSlug) return `Saved from ${url.hostname.replace(/^www\./, "")}`

  return rawSlug.replace(/\b\w/g, (letter) => letter.toUpperCase())
}

export function challengeFallback(href: string, source: string) {
  const detectedSource = sourceFromKeepUrl(href)
  const resolvedSource = detectedSource === "Article" ? source : detectedSource
  const title = titleFromKeepUrl(href)

  return {
    title,
    source: resolvedSource,
    summary: `A saved ${resolvedSource} project titled “${title}”. Open the original to view the complete work.`,
    tags:
      resolvedSource === "Dribbble" || resolvedSource === "Behance"
        ? [resolvedSource, "Design"]
        : [resolvedSource],
  }
}
