import { Cencori } from "cencori"

type EditorialMetadata = {
  title: string
  excerpt: string
  seoDescription: string
  slug: string
  tags: string[]
}

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
}

function fallbackMetadata(bodyText: string): EditorialMetadata {
  const firstSentence =
    bodyText
      .split(/(?<=[.!?])\s+|\n+/)[0]
      ?.trim()
      .slice(0, 90) || "A new rant"
  const title = firstSentence.replace(/[.!?]+$/, "")
  return {
    title,
    excerpt: bodyText.replace(/\s+/g, " ").trim().slice(0, 180),
    seoDescription: bodyText.replace(/\s+/g, " ").trim().slice(0, 155),
    slug: cleanSlug(title) || `rant-${Date.now()}`,
    tags: ["Thoughts"],
  }
}

export async function generateRantMetadata(bodyText: string) {
  const apiKey = process.env.CENCORI_API_KEY?.trim()
  if (!apiKey) return fallbackMetadata(bodyText)

  try {
    const cencori = new Cencori({ apiKey })
    const response = await cencori.ai.generateObject<EditorialMetadata>({
      model:
        process.env.CENCORI_RANTS_MODEL?.trim() ||
        process.env.CENCORI_KEEPS_MODEL?.trim() ||
        "gpt-4o-mini",
      schemaName: "rant_editorial_metadata",
      schemaDescription:
        "Editorial metadata for a personal Rant written by Tomiwa David.",
      schema: {
        type: "object",
        additionalProperties: false,
        properties: {
          title: { type: "string", minLength: 4, maxLength: 90 },
          excerpt: { type: "string", minLength: 20, maxLength: 190 },
          seoDescription: { type: "string", minLength: 30, maxLength: 160 },
          slug: { type: "string", minLength: 3, maxLength: 72 },
          tags: {
            type: "array",
            minItems: 1,
            maxItems: 3,
            items: { type: "string", minLength: 2, maxLength: 24 },
          },
        },
        required: ["title", "excerpt", "seoDescription", "slug", "tags"],
      },
      maxTokens: 400,
      messages: [
        {
          role: "system",
          content:
            "You prepare metadata for Tomiwa David's Rants. Preserve his meaning and voice. Do not rewrite the body. Use plain, thoughtful English without em dashes, hype, hashtags, or invented claims. The excerpt is one concise sentence. The SEO description is factual and inviting. Return one to three short Title Case topic tags and a lowercase URL slug.",
        },
        { role: "user", content: bodyText.slice(0, 12000) },
      ],
    })

    return {
      ...response.object,
      slug: cleanSlug(response.object.slug) || cleanSlug(response.object.title),
      tags: [...new Set(response.object.tags.map((tag) => tag.trim()))].slice(
        0,
        3
      ),
    }
  } catch (error) {
    console.error("Rant metadata generation failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return fallbackMetadata(bodyText)
  }
}

export function estimateReadingMinutes(bodyText: string) {
  const words = bodyText.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.ceil(words / 220))
}
