import { resolve } from "node:dns/promises"
import { isIP } from "node:net"
import { Cencori } from "cencori"

import type { KeepDraft } from "@/lib/keeps/types"

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

async function readPage(initialUrl: string) {
  let url = await assertPublicUrl(initialUrl)

  for (let redirect = 0; redirect < 4; redirect += 1) {
    const response = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "daaysorn-keeps/1.0 (+https://daaysorn.com/keeps)",
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
    const body = decodeHtml(
      html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 8000)
    )

    return { href: url.toString(), title, description, author, body }
  }

  return {
    href: url.toString(),
    title: "",
    description: "",
    author: "",
    body: "",
  }
}

function sourceFrom(url: URL) {
  const host = url.hostname.replace(/^www\./, "")
  if (host === "x.com" || host === "twitter.com") return "X"
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
}: {
  href: string
  rawText: string
  telegramMessageId: number
}): Promise<KeepDraft> {
  const page = await readPage(href)
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
        summary: { type: "string", minLength: 30, maxLength: 420 },
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
          "You edit Tomiwa David's public Keeps collection. Write plain, non-technical English. State the useful idea accurately, never invent missing details, never use em dashes, and do not mention that AI created the summary. Return short title case tags.",
      },
      {
        role: "user",
        content: JSON.stringify({
          originalMessage: rawText,
          pageTitle: page.title,
          pageDescription: page.description,
          pageAuthor: page.author,
          pageText: page.body,
          source: sourceFrom(new URL(page.href)),
        }),
      },
    ],
  })

  return {
    href: page.href,
    source: sourceFrom(new URL(page.href)),
    author: response.object.author,
    title: response.object.title,
    summary: response.object.summary,
    tags: response.object.tags,
    telegramMessageId,
    rawText,
  }
}
