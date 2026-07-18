const commonTrackingParameters = [
  "fbclid",
  "gclid",
  "igsh",
  "mc_cid",
  "mc_eid",
  "ref_src",
]

export function normalizeKeepUrl(value: string) {
  const url = new URL(value.trim())
  url.hash = ""
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "")

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_")) url.searchParams.delete(key)
  }
  for (const key of commonTrackingParameters) url.searchParams.delete(key)

  if (url.hostname === "twitter.com") url.hostname = "x.com"
  if (url.hostname === "x.com") url.search = ""
  if (
    url.hostname === "tiktok.com" ||
    url.hostname === "instagram.com" ||
    url.hostname === "threads.net"
  ) {
    url.search = ""
  }

  if (url.hostname === "youtu.be" || url.hostname === "youtube.com") {
    const segments = url.pathname.split("/").filter(Boolean)
    const pathVideoId = ["live", "shorts", "embed"].includes(segments[0] ?? "")
      ? segments[1]
      : undefined
    const videoId =
      url.hostname === "youtu.be"
        ? segments[0]
        : url.searchParams.get("v") || pathVideoId
    url.hostname = "youtube.com"
    url.pathname = videoId ? "/watch" : url.pathname
    url.search = videoId ? `?v=${encodeURIComponent(videoId)}` : ""
  }

  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "")

  return url.toString()
}
