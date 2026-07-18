import { neon } from "@neondatabase/serverless"
import { unstable_cache } from "next/cache"

import type { Keep, KeepDraft } from "@/lib/keeps/types"
import { challengeFallback, isChallengeContent } from "@/lib/keeps/fallback"
import { limitSentences } from "@/lib/keeps/text"
import { normalizeKeepUrl } from "@/lib/keeps/url"

let schemaReady: Promise<void> | undefined

function database() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) return null

  return neon(databaseUrl)
}

async function ensureSchema() {
  const sql = database()
  if (!sql) return

  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS keeps (
        id TEXT PRIMARY KEY,
        href TEXT NOT NULL UNIQUE,
        source TEXT NOT NULL,
        author TEXT NOT NULL,
        title TEXT NOT NULL,
        summary TEXT NOT NULL,
        image_url TEXT,
        tags TEXT[] NOT NULL DEFAULT '{}',
        telegram_message_id BIGINT NOT NULL,
        raw_text TEXT NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      ALTER TABLE keeps
      ADD COLUMN IF NOT EXISTS image_url TEXT
    `
    await sql`
      ALTER TABLE keeps
      DROP CONSTRAINT IF EXISTS keeps_telegram_message_id_key
    `
    await sql`
      CREATE INDEX IF NOT EXISTS keeps_saved_at_idx
      ON keeps (saved_at DESC)
    `

    const existing = (await sql`
      SELECT id, href
      FROM keeps
      ORDER BY saved_at DESC
    `) as { id: string; href: string }[]
    const canonicalUrls = new Set<string>()

    for (const row of existing) {
      const normalizedHref = normalizeKeepUrl(row.href)
      if (canonicalUrls.has(normalizedHref)) {
        await sql`DELETE FROM keeps WHERE id = ${row.id}`
        continue
      }

      canonicalUrls.add(normalizedHref)
      if (normalizedHref !== row.href) {
        await sql`
          UPDATE keeps
          SET href = ${normalizedHref}
          WHERE id = ${row.id}
        `
      }
    }
  })()

  await schemaReady
}

type KeepRow = {
  id: string
  href: string
  source: string
  author: string
  title: string
  summary: string
  image_url: string | null
  tags: string[]
  saved_at: string | Date
}

function toKeep(row: KeepRow): Keep {
  const challenged = isChallengeContent(row.title, row.summary, ...row.tags)
  const fallback = challenged ? challengeFallback(row.href, row.source) : null

  return {
    id: row.id,
    href: row.href,
    source: fallback?.source ?? row.source,
    author: row.author,
    title: fallback?.title ?? row.title,
    summary: limitSentences(fallback?.summary ?? row.summary),
    imageUrl: row.image_url,
    tags: fallback?.tags ?? row.tags,
    savedAt: new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(new Date(row.saved_at)),
  }
}

async function queryKeeps(): Promise<Keep[]> {
  const sql = database()
  if (!sql) return []

  await ensureSchema()
  const rows = (await sql`
    SELECT id, href, source, author, title, summary, image_url, tags, saved_at
    FROM keeps
    ORDER BY saved_at DESC
    LIMIT 100
  `) as KeepRow[]

  return rows.map(toKeep)
}

export const listKeeps = unstable_cache(queryKeeps, ["keeps-list"], {
  tags: ["keeps"],
  revalidate: 86400,
})

export async function saveKeep(draft: KeepDraft) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  await ensureSchema()
  const id = crypto.randomUUID()

  await sql`
    INSERT INTO keeps (
      id, href, source, author, title, summary, image_url, tags,
      telegram_message_id, raw_text
    ) VALUES (
      ${id}, ${draft.href}, ${draft.source}, ${draft.author}, ${draft.title},
      ${draft.summary}, ${draft.imageUrl}, ${draft.tags}, ${draft.telegramMessageId}, ${draft.rawText}
    )
    ON CONFLICT (href) DO UPDATE SET
      source = EXCLUDED.source,
      author = EXCLUDED.author,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      image_url = EXCLUDED.image_url,
      tags = EXCLUDED.tags,
      telegram_message_id = EXCLUDED.telegram_message_id,
      raw_text = EXCLUDED.raw_text,
      saved_at = NOW()
  `
}

export async function deleteKeepByHref(href: string) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  await ensureSchema()
  const normalizedHref = normalizeKeepUrl(href)
  const result = await sql`
    DELETE FROM keeps
    WHERE href = ${href} OR href = ${normalizedHref}
    RETURNING id
  `

  return result.length > 0
}
