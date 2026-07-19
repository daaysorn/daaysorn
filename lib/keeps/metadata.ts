export const keepTagTaxonomy = [
  "AI",
  "Business",
  "Career",
  "Culture",
  "Design",
  "Development",
  "Education",
  "Entertainment",
  "Finance",
  "Food",
  "Housing",
  "Lifestyle",
  "Parenting",
  "Science",
  "Security",
  "Technology",
  "Travel",
] as const

const genericEditorialPhrases = [
  "impressive",
  "stunning",
  "captivating",
  "original content can be viewed",
  "instagram post overview",
  "public caption and thumbnail content",
]

export function isGenericKeepCopy(...values: string[]) {
  const copy = values.join(" ").toLowerCase()
  return genericEditorialPhrases.some((phrase) => copy.includes(phrase))
}

export type InstagramResource =
  | { kind: "profile"; handle: string }
  | { kind: "reel" | "post" | "story"; handle: null }
  | { kind: "other"; handle: null }

export function instagramResourceFromUrl(href: string): InstagramResource {
  const url = new URL(href)
  const segments = url.pathname.split("/").filter(Boolean)
  const first = segments[0]?.toLowerCase() ?? ""

  if (first === "reel" || first === "reels") {
    return { kind: "reel", handle: null }
  }
  if (first === "p" || first === "tv") {
    return { kind: "post", handle: null }
  }
  if (first === "stories") {
    return { kind: "story", handle: null }
  }
  if (
    segments.length === 1 &&
    first &&
    !["accounts", "about", "developer", "explore", "legal"].includes(first)
  ) {
    return { kind: "profile", handle: segments[0] }
  }

  return { kind: "other", handle: null }
}

export function isInstagramAuthUrl(href: string) {
  const url = new URL(href)
  return (
    url.hostname.replace(/^www\./, "") === "instagram.com" &&
    /^\/accounts\/(?:login|signup)(?:\/|$)/i.test(url.pathname)
  )
}

export function originalKeepHref(href: string, rawText: string) {
  if (!isInstagramAuthUrl(href)) return href

  const submittedHref = rawText.match(/https?:\/\/[^\s<>]+/i)?.[0]
  if (!submittedHref) return href

  try {
    const submittedUrl = new URL(submittedHref)
    return submittedUrl.hostname.replace(/^www\./, "") === "instagram.com"
      ? submittedHref
      : href
  } catch {
    return href
  }
}
