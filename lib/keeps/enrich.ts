import { resolve } from "node:dns/promises"
import { isIP } from "node:net"
import { Cencori } from "cencori"

import type { KeepDraft } from "@/lib/keeps/types"
import { challengeFallback, isChallengeContent } from "@/lib/keeps/fallback"
import { limitSentences } from "@/lib/keeps/text"
import { normalizeKeepUrl } from "@/lib/keeps/url"

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

async function readPage(initialUrl: string) {
  let url = await assertPublicUrl(normalizeKeepUrl(initialUrl))

  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 daaysorn-keeps/1.0",
      },
    })

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location")
      if (!location) break
      url = await assertPublicUrl(new URL(location, url).toString())
      continue
    }

    const type = response.headers.get("content-type") ?? ""
    if (!response.ok || !type.includes("text/html")) break

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

  return {
    href: normalizeKeepUrl(url.toString()),
    title: "",
    description: "",
    author: "",
    imageUrl: null,
    body: "",
  }
}

function sourceFrom(url: URL) {
  const host = url.hostname.replace(/^www\./, "")
  if (host === "x.com" || host === "twitter.com") return "X"
  if (host === "behance.net") return "Behance"
  if (host === "dribbble.com") return "Dribbble"
  if (host === "instagram.com") return "Instagram"
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
  const page = await readPage(href)
  const ownerNote = rawText
    .replace(/https?:\/\/[^\s<>]+/gi, "")
    .replace(/(?:^|\s)#[\p{L}\p{N}_-]{2,24}/gu, " ")
    .trim()
  const source = sourceFrom(new URL(page.href))
  const contentAvailability =
    source === "Instagram"
      ? "Public caption and thumbnail only. No reel transcript, audio, or full video content is available. Engagement counts are not content."
      : source === "TikTok"
        ? "Public embed metadata only. A transcript may not be available."
        : "Public page metadata and readable page text."
  const pageText = source === "Instagram" ? page.description : page.body

  if (source === "TikTok" && !page.body && !ownerNote) {
    return {
      href: page.href,
      source,
      author: page.author,
      title: page.title,
      summary: `A saved TikTok post from ${page.author}. View the original post for its photos, caption, and full context.`,
      imageUrl: page.imageUrl,
      tags: [...new Set([...customTags, "TikTok"])].slice(0, 5),
      telegramMessageId,
      rawText,
    }
  }

  if (source === "Instagram" && !ownerNote) {
    const caption = page.description.replace(/\s+/g, " ").trim()
    const title =
      caption.split(/[.!?](?:\s|$)/, 1)[0]?.trim() ||
      `Instagram reel by ${page.author}`
    const quotedCaption = caption
      .replace(/[.!?]+(?=\s|$)/g, ";")
      .replace(/“([^”]+)”/g, "‘$1’")
      .replace(
        /;\s+([A-Z])/g,
        (_, letter: string) => `; ${letter.toLowerCase()}`
      )
      .replace(/;+$/, "")

    return {
      href: page.href,
      source,
      author: page.author,
      title,
      summary: `@${page.author.replace(/^@/, "")} shared the caption “${quotedCaption}.” Open the original reel for the full video context.`,
      imageUrl: page.imageUrl,
      tags: [...new Set([...customTags, "Instagram"])].slice(0, 5),
      telegramMessageId,
      rawText,
    }
  }

  const apiKey = process.env.CENCORI_API_KEY?.trim()
  if (!apiKey) throw new Error("CENCORI_API_KEY is not configured")

  const cencori = new Cencori({ apiKey })
  const response = await cencori.ai.generateObject<AiKeep>({
    model: process.env.CENCORI_KEEPS_MODEL?.trim() || "gpt-4o-mini",
    schemaName: "keeps_entry",
    schemaDescription:
      "A concise editorial entry for Tomiwa David's public Keeps page.",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        title: { type: "string", minLength: 4, maxLength: 100 },
        summary: { type: "string", minLength: 30, maxLength: 320 },
        author: { type: "string", minLength: 1, maxLength: 80 },
        tags: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: { type: "string", minLength: 2, maxLength: 24 },
        },
      },
      required: ["title", "summary", "author", "tags"],
    },
    maxTokens: 350,
    messages: [
      {
        role: "system",
        content:
          "You edit Tomiwa David's public Keeps collection. Write plain, non-technical English. The summary must contain no more than two concise sentences. The owner's note is the most trusted context when present. State only facts explicitly supported by the owner note or supplied page data. Never invent, infer, or confidently reframe missing details. Never use em dashes and never mention that AI created the summary. Return short Title Case tags. For Instagram, the supplied text is public caption metadata, not a reel transcript: ignore likes and comment counts, do not claim what happens in the video, and do not turn a request to comment for a link into a promotion, giveaway, or offer. If details are unavailable, say that the original post provides the full context. Do not describe the social platform in general.",
      },
      {
        role: "user",
        content: JSON.stringify({
          ownerNote,
          pageTitle: page.title,
          pageDescription: page.description,
          pageAuthor: page.author,
          pageText,
          contentAvailability,
          source,
        }),
      },
    ],
  })

  return {
    href: page.href,
    source,
    author: response.object.author,
    title: response.object.title,
    summary: limitSentences(response.object.summary),
    imageUrl: page.imageUrl,
    tags: [...new Set([...customTags, ...response.object.tags])].slice(0, 5),
    telegramMessageId,
    rawText,
  }
}
