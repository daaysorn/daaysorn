import { resolve } from "node:dns/promises"
import { isIP } from "node:net"
import { Cencori } from "cencori"

import type { KeepDraft } from "@/lib/keeps/types"
import {
  challengeFallback,
  isChallengeContent,
  titleFromKeepUrl,
} from "@/lib/keeps/fallback"
import { limitSentences } from "@/lib/keeps/text"
import {
  cacheKeepPreview,
  captureKeepScreenshotPreview,
} from "@/lib/keeps/preview-storage"
import { normalizeKeepUrl } from "@/lib/keeps/url"
import {
  hasVerifiedInstagramContext,
  instagramResourceFromUrl,
  isGenericKeepCopy,
  isInstagramAuthUrl,
  keepTagTaxonomy,
  originalKeepHref,
} from "@/lib/keeps/metadata"

const privateIpv4 = [
  /^10\./,
  /^127\./,
  /^169\.254\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
]

function isPrivateAddress(address: string) {
  if (isIP(address) === 4) return privateIpv4.some((rule) => rule.test(address))

  const normalized = address.toLowerCase()
  return (
    normalized === "::1" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80:")
  )
}

async function assertPublicUrl(value: string) {
  const url = new URL(value)
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only web links can be kept")
  }

  const addresses = await resolve(url.hostname)
  if (!addresses.length || addresses.some(isPrivateAddress)) {
    throw new Error("Private network links are not supported")
  }

  return url
}

function decodeHtml(value: string) {
  return value
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 16))
    )
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCodePoint(Number.parseInt(code, 10))
    )
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
}

function meta(html: string, key: string) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`,
      "i"
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`,
      "i"
    ),
  ]

  for (const pattern of patterns) {
    const match = html.match(pattern)?.[1]
    if (match) return decodeHtml(match.trim())
  }

  return ""
}

async function readInstagramPage(url: URL) {
  const requestUrl = new URL(url)
  requestUrl.hostname = "www.instagram.com"
  const userAgents = [
    "Mozilla/5.0",
    "facebookexternalhit/1.1 (+https://www.facebook.com/externalhit_uatext.php)",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/131 Safari/537.36",
  ]

  for (const [attempt, userAgent] of userAgents.entries()) {
    try {
      const publicUrl = await assertPublicUrl(requestUrl.toString())
      const response = await fetch(publicUrl, {
        redirect: "manual",
        signal: AbortSignal.timeout(10_000),
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "en-US,en;q=0.9",
          "User-Agent": userAgent,
        },
      })
      if (!response.ok) continue

      const html = (await response.text()).slice(0, 750_000)
      const title = meta(html, "og:title")
      const description =
        meta(html, "og:description") || meta(html, "description")
      const image = meta(html, "og:image") || meta(html, "twitter:image")
      if (!title && !description && !image) continue

      const author =
        description.match(/-\s*([\w.]+)\s+on\s+/i)?.[1] ||
        title.match(/^(.+?)\s+on Instagram:/i)?.[1] ||
        "Instagram"
      const context = description || title
      return {
        href: normalizeKeepUrl(url.toString()),
        title,
        description: context,
        author: cleanEditorialText(author),
        imageUrl: image ? new URL(image, publicUrl).toString() : null,
        body: context,
      }
    } catch (error) {
      if (attempt === userAgents.length - 1) {
        console.error("Instagram metadata retries failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        })
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)))
  }

  return null
}

async function readTikTokEmbed(url: URL) {
  const response = await fetch(
    `https://www.tiktok.com/oembed?url=${encodeURIComponent(url.toString())}`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    author_name?: string
    thumbnail_url?: string
  }

  return {
    title: data.title?.trim() ?? "",
    author: data.author_name?.trim() ?? "",
    imageUrl: data.thumbnail_url?.trim() || null,
  }
}

async function readInstagramEmbed(url: URL) {
  const response = await fetch(
    `https://www.instagram.com/api/v1/oembed/?url=${encodeURIComponent(url.toString())}`,
    {
      signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "Mozilla/5.0" },
    }
  )
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    author_name?: string
    thumbnail_url?: string
  }

  return {
    title: data.title?.trim() ?? "",
    author: data.author_name?.trim() ?? "",
    imageUrl: data.thumbnail_url?.trim() || null,
  }
}

async function readYouTubeEmbed(url: URL) {
  const response = await fetch(
    `https://www.youtube.com/oembed?url=${encodeURIComponent(url.toString())}&format=json`,
    { signal: AbortSignal.timeout(8000) }
  )
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    author_name?: string
    thumbnail_url?: string
  }

  return {
    title: data.title?.trim() ?? "",
    author: data.author_name?.trim() ?? "",
    imageUrl: data.thumbnail_url?.trim() || null,
  }
}

async function readDiscoveredEmbed(html: string, pageUrl: URL) {
  const tag = html.match(
    /<link[^>]+type=["']application\/json\+oembed["'][^>]*>/i
  )?.[0]
  const href = tag?.match(/href=["']([^"']+)["']/i)?.[1]
  if (!href) return null

  const endpoint = await assertPublicUrl(
    decodeHtml(new URL(href, pageUrl).toString())
  )
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(8000),
    headers: { Accept: "application/json" },
  })
  if (!response.ok) return null

  const data = (await response.json()) as {
    title?: string
    author_name?: string
    provider_name?: string
    thumbnail_url?: string
  }

  return {
    title: data.title?.trim() ?? "",
    author: data.author_name?.trim() || data.provider_name?.trim() || "",
    imageUrl: data.thumbnail_url?.trim() || null,
  }
}

function contentTypeLabel(contentType: string) {
  if (contentType.startsWith("image/")) return "image"
  if (contentType.startsWith("video/")) return "video"
  if (contentType.startsWith("audio/")) return "audio file"
  if (contentType.includes("pdf")) return "PDF document"
  if (contentType.includes("json")) return "JSON resource"
  if (contentType.startsWith("text/")) return "text document"
  return "file"
}

async function readPage(initialUrl: string) {
  let url = await assertPublicUrl(normalizeKeepUrl(initialUrl))

  if (sourceFrom(url) === "Instagram") {
    const instagramPage = await readInstagramPage(url)
    if (instagramPage) return instagramPage
  }

  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": "Mozilla/5.0",
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) break
      const redirectUrl = new URL(location, url)
      if (isInstagramAuthUrl(redirectUrl.toString())) break
      url = await assertPublicUrl(redirectUrl.toString())
      continue
    }

    const type = response.headers.get("content-type") ?? ""
    if (!response.ok) break
    if (!type.includes("text/html")) {
      const href = normalizeKeepUrl(url.toString())
      const label = contentTypeLabel(type)
      return {
        href,
        title: titleFromKeepUrl(href),
        description: `A saved ${label} from ${url.hostname.replace(/^www\./, "")}.`,
        author: url.hostname.replace(/^www\./, ""),
        imageUrl: type.startsWith("image/") ? href : null,
        body: "",
      }
    }

    const html = (await response.text()).slice(0, 500_000)
    const title =
      meta(html, "og:title") ||
      decodeHtml(html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "")
    const description =
      meta(html, "og:description") || meta(html, "description")
    const author = meta(html, "author") || meta(html, "og:site_name")
    const image = meta(html, "og:image") || meta(html, "twitter:image")
    const body = decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000)
    )

    const source = sourceFrom(url)

    if (source === "YouTube") {
      const embed = await readYouTubeEmbed(url)
      if (embed?.title) {
        const context = description || embed.title
        return {
          href: normalizeKeepUrl(url.toString()),
          title: embed.title,
          description: context,
          author: embed.author || author,
          imageUrl:
            embed.imageUrl || (image ? new URL(image, url).toString() : null),
          body: context,
        }
      }
    }

    if (source === "Instagram") {
      const embed = await readInstagramEmbed(url)
      if (embed?.title) {
        return {
          href: normalizeKeepUrl(url.toString()),
          title: embed.title,
          description: embed.title,
          author: embed.author || author,
          imageUrl: embed.imageUrl,
          body: embed.title,
        }
      }
    }

    const discoveredEmbed = await readDiscoveredEmbed(html, url).catch(
      () => null
    )
    if (discoveredEmbed?.title) {
      const context = description || discoveredEmbed.title
      return {
        href: normalizeKeepUrl(url.toString()),
        title: discoveredEmbed.title,
        description: context,
        author: discoveredEmbed.author || author,
        imageUrl:
          discoveredEmbed.imageUrl ||
          (image ? new URL(image, url).toString() : null),
        body: context,
      }
    }

    if (isChallengeContent(title, description, body)) {
      const fallback = challengeFallback(url.toString(), source)
      return {
        href: normalizeKeepUrl(url.toString()),
        title: fallback.title,
        description: fallback.summary,
        author: source,
        imageUrl: image ? new URL(image, url).toString() : null,
        body: fallback.summary,
      }
    }

    if (source === "TikTok") {
      const embed = await readTikTokEmbed(url)
      if (embed?.title) {
        return {
          href: normalizeKeepUrl(url.toString()),
          title: embed.title,
          description: embed.title,
          author: embed.author || author,
          imageUrl: embed.imageUrl,
          body: embed.title,
        }
      }

      const handle =
        url.pathname.split("/").find((segment) => segment.startsWith("@")) ??
        "TikTok creator"

      return {
        href: normalizeKeepUrl(url.toString()),
        title: `TikTok post by ${handle}`,
        description: "",
        author: handle,
        imageUrl: image ? new URL(image, url).toString() : null,
        body: "",
      }
    }

    return {
      href: normalizeKeepUrl(url.toString()),
      title,
      description,
      author,
      imageUrl: image ? new URL(image, url).toString() : null,
      body,
    }
  }

  const href = normalizeKeepUrl(url.toString())
  return {
    href,
    title: titleFromKeepUrl(href),
    description: `A saved link from ${url.hostname.replace(/^www\./, "")}. Open the original for full context.`,
    author: url.hostname.replace(/^www\./, ""),
    imageUrl: null,
    body: "",
  }
}

function sourceFrom(url: URL) {
  const host = url.hostname.replace(/^www\./, "")
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

type AiKeep = {
  title: string
  summary: string
  author: string
  tags: string[]
}

type AiKeepReview = {
  accepted: boolean
  feedback: string
  unsupportedClaims: string[]
}

const keepSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", minLength: 4, maxLength: 100 },
    summary: { type: "string", minLength: 30, maxLength: 320 },
    author: { type: "string", minLength: 1, maxLength: 80 },
    tags: {
      type: "array",
      minItems: 1,
      maxItems: 2,
      items: { type: "string", enum: [...keepTagTaxonomy] },
    },
  },
  required: ["title", "summary", "author", "tags"],
}

const editorialSystemPrompt =
  "You edit Tomiwa David's public Keeps collection. Always translate and rewrite every title and summary into natural English, even when the source is in another language. Create a clear editorial title instead of copying the source title or caption. Never use emojis in the title. Never use hashtags or include # anywhere in the title or summary. Write plain, non-technical English. The summary must contain no more than two concise sentences and should not reproduce a long caption. The owner's note is the most trusted context when present. State only facts explicitly supported by the owner note or supplied page data. Never invent, infer, or confidently reframe missing details. Never create a title or summary about browser verification, JavaScript, CAPTCHA, access checks, or being a robot. Never use promotional framing such as free offer, giveaway, or amazing deal unless the owner's note explicitly uses that framing. Never use em dashes and never mention that AI created the summary. The words impressive, stunning, and captivating are forbidden. Never write vague filler such as original content can be viewed. Choose one or two broad topic tags from the supplied taxonomy. Do not use a platform, person, content format, or overly specific phrase as a tag. For Instagram, respect instagramResourceKind: a profile is not a post or reel. Instagram post and reel text is public caption metadata, not a transcript: ignore likes and comment counts and do not claim what happens in the video. The thumbnail analysis describes one visible frame and is valid evidence only for objects, text, and context visible in that frame. Combine it with the caption without extrapolating beyond either source. If details are unavailable, identify the saved resource accurately and say that the original provides the full context. Do not describe the social platform in general."

async function generateKeepMetadata(
  cencori: Cencori,
  evidence: Record<string, unknown>,
  revisionFeedback = ""
) {
  return cencori.ai.generateObject<AiKeep>({
    model: process.env.CENCORI_KEEPS_MODEL?.trim() || "gpt-4.1-nano",
    schemaName: "keeps_entry",
    schemaDescription:
      "A concise editorial entry for Tomiwa David's public Keeps page.",
    schema: keepSchema,
    maxTokens: 350,
    messages: [
      { role: "system", content: editorialSystemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          ...evidence,
          revisionFeedback: revisionFeedback || undefined,
        }),
      },
    ],
  })
}

async function reviewKeepMetadata(
  cencori: Cencori,
  evidence: Record<string, unknown>,
  candidate: AiKeep
) {
  return cencori.ai.generateObject<AiKeepReview>({
    model: process.env.CENCORI_KEEPS_REVIEW_MODEL?.trim() || "gpt-4.1-mini",
    schemaName: "keeps_entry_review",
    schemaDescription:
      "An evidence-based quality review of proposed Keeps metadata.",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accepted: { type: "boolean" },
        feedback: { type: "string", minLength: 1, maxLength: 400 },
        unsupportedClaims: {
          type: "array",
          maxItems: 6,
          items: { type: "string", maxLength: 160 },
        },
      },
      required: ["accepted", "feedback", "unsupportedClaims"],
    },
    maxTokens: 300,
    messages: [
      {
        role: "system",
        content:
          "You are the independent quality gate for public editorial metadata. Compare the candidate only with the supplied evidence. Reject unsupported claims, guessed events, truly generic or tautological titles, promotional filler, incorrect authors or resource types, unrelated tags, and summaries that merely say to view the original. A thumbnail analysis proves only what is visible in one frame. Read the candidate carefully and never claim it omitted a detail that it explicitly contains. Do not demand details absent from the evidence. A broad but factual title based on the source caption is acceptable. Give concrete, evidence-bounded rewrite instructions when rejecting. Accept specific, natural, factual copy.",
      },
      {
        role: "user",
        content: JSON.stringify({ evidence, candidate }),
      },
    ],
  })
}

function cleanEditorialText(value: string) {
  return value
    .replace(/#[\p{L}\p{N}_-]+/gu, " ")
    .replaceAll("#", "")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanAiTitle(value: string) {
  return cleanEditorialText(
    value.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, " ")
  )
}

async function analyzeInstagramThumbnail(
  cencori: Cencori,
  imageUrl: string | null
) {
  if (!imageUrl) return ""
  try {
    const response = await cencori.vision.analyze({
      image: { url: imageUrl },
      model: process.env.CENCORI_KEEPS_VISION_MODEL?.trim() || "gpt-4.1-nano",
      prompt:
        "Describe only the visible subject, objects, product names, and readable text in this Instagram thumbnail. Be factual and concise. Do not use marketing adjectives or infer events outside this single frame.",
      maxTokens: 180,
      temperature: 0,
    })
    return cleanEditorialText(response.analysis).slice(0, 800)
  } catch (error) {
    console.error("Instagram thumbnail analysis failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return ""
  }
}

export async function enrichKeep({
  href,
  rawText,
  telegramMessageId,
  customTags = [],
}: {
  href: string
  rawText: string
  telegramMessageId: number
  customTags?: string[]
}): Promise<KeepDraft> {
  const recoveredHref = originalKeepHref(href, rawText)
  const page = await readPage(recoveredHref)
  const ownerNote = rawText
    .replace(/https?:\/\/[^\s<>]+/gi, "")
    .replace(/(?:^|\s)#[\p{L}\p{N}_-]{2,24}/gu, " ")
    .replace(/(?:^|\s)\/keep(?:@\w+)?\b/gi, " ")
    .trim()
  const source = sourceFrom(new URL(page.href))
  const instagramResource =
    source === "Instagram" ? instagramResourceFromUrl(page.href) : null
  const challengeSafeCopy = challengeFallback(page.href, source)
  const pageWasChallenge =
    page.title === challengeSafeCopy.title &&
    page.description === challengeSafeCopy.summary

  // Challenge pages contain no useful source material. Avoid paying for an AI
  // rewrite unless the owner supplied a trusted note with actual context.
  if (pageWasChallenge && !ownerNote && source !== "Instagram") {
    const imageUrl = await captureKeepScreenshotPreview(page.href)
    return {
      href: page.href,
      source: challengeSafeCopy.source,
      author: source,
      title: cleanAiTitle(challengeSafeCopy.title),
      summary: challengeSafeCopy.summary,
      imageUrl,
      tags: challengeSafeCopy.tags,
      telegramMessageId,
      rawText,
    }
  }
  const contentAvailability =
    source === "Instagram"
      ? instagramResource?.kind === "profile"
        ? "Public Instagram profile metadata only. This URL is a creator profile, not a post or reel."
        : `Public Instagram ${instagramResource?.kind ?? "content"} caption and thumbnail only. No transcript, audio, or full video content is available. Engagement counts are not content.`
      : source === "TikTok"
        ? "Public embed metadata only. A transcript may not be available."
        : "Public page metadata and readable page text."
  const pageText = source === "Instagram" ? page.description : page.body

  const apiKey = process.env.CENCORI_API_KEY?.trim()
  if (!apiKey) throw new Error("CENCORI_API_KEY is not configured")

  const cencori = new Cencori({ apiKey })
  const instagramPreview =
    source === "Instagram"
      ? ((await cacheKeepPreview(page.imageUrl, page.href)) ??
        (await captureKeepScreenshotPreview(page.href)))
      : null
  const thumbnailAnalysis =
    source === "Instagram"
      ? await analyzeInstagramThumbnail(
          cencori,
          page.imageUrl ?? instagramPreview
        )
      : ""
  if (
    source === "Instagram" &&
    !hasVerifiedInstagramContext({
      ownerNote,
      thumbnailAnalysis,
      title: page.title,
      description: page.description,
    })
  ) {
    throw new Error(
      "Instagram did not provide enough verified metadata to save this link"
    )
  }
  const evidence = {
    ownerNote,
    pageTitle: page.title,
    pageDescription: page.description,
    pageAuthor: page.author,
    pageText,
    thumbnailAnalysis,
    contentAvailability,
    source,
    instagramResourceKind: instagramResource?.kind,
    instagramHandle: instagramResource?.handle,
    previousTagsAsHints: customTags,
    allowedTags: keepTagTaxonomy,
  }
  let candidate = (await generateKeepMetadata(cencori, evidence)).object
  let aiTitle = cleanAiTitle(candidate.title)
  let aiSummary = limitSentences(cleanEditorialText(candidate.summary))
  let deterministicRejection =
    isChallengeContent(aiTitle, aiSummary) ||
    isGenericKeepCopy(aiTitle, aiSummary)
  let review = (await reviewKeepMetadata(cencori, evidence, candidate)).object

  if (deterministicRejection || !review.accepted) {
    const feedback = [
      deterministicRejection
        ? "The draft failed deterministic checks for generic, challenge, or unsupported copy."
        : "",
      review.feedback,
      ...review.unsupportedClaims.map((claim) => `Unsupported: ${claim}`),
    ]
      .filter(Boolean)
      .join(" ")
    candidate = (await generateKeepMetadata(cencori, evidence, feedback)).object
    aiTitle = cleanAiTitle(candidate.title)
    aiSummary = limitSentences(cleanEditorialText(candidate.summary))
    deterministicRejection =
      isChallengeContent(aiTitle, aiSummary) ||
      isGenericKeepCopy(aiTitle, aiSummary)
    review = (await reviewKeepMetadata(cencori, evidence, candidate)).object
  }

  if (deterministicRejection || !review.accepted) {
    throw new Error("AI metadata review rejected the corrected draft")
  }

  const aiAuthor =
    cleanAiTitle(candidate.author) ||
    instagramResource?.handle ||
    page.author ||
    source
  const imageUrl =
    instagramPreview ??
    (await cacheKeepPreview(page.imageUrl, page.href)) ??
    (await captureKeepScreenshotPreview(page.href))

  return {
    href: page.href,
    source,
    author: aiAuthor,
    title: aiTitle,
    summary: aiSummary,
    imageUrl,
    tags: [
      ...new Set(
        candidate.tags
          .map((tag) => tag.replace(/^#+/, "").trim())
          .filter(Boolean)
      ),
    ].slice(0, 2),
    telegramMessageId,
    rawText,
  }
}
