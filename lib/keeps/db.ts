import { neon } from "@neondatabase/serverless"

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

export async function migrateKeepsSchema() {
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
        ai_format_version INTEGER NOT NULL DEFAULT 0,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      ALTER TABLE keeps
      ADD COLUMN IF NOT EXISTS image_url TEXT,
      ADD COLUMN IF NOT EXISTS ai_format_version INTEGER NOT NULL DEFAULT 0
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

// Production requests never perform DDL. Run `bun run db:migrate` when the
// schema changes; this no-op remains temporarily to keep data functions small.
async function ensureSchema() {}

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

  const rows = (await sql`
    SELECT id, href, source, author, title, summary, image_url, tags, saved_at
    FROM keeps
    ORDER BY saved_at DESC
    LIMIT 100
  `) as KeepRow[]

  return rows.map(toKeep)
}

export const listKeeps = queryKeeps

export async function saveKeep(draft: KeepDraft) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const id = crypto.randomUUID()

  await sql`
    INSERT INTO keeps (
      id, href, source, author, title, summary, image_url, tags,
      telegram_message_id, raw_text, ai_format_version
    ) VALUES (
      ${id}, ${draft.href}, ${draft.source}, ${draft.author}, ${draft.title},
      ${draft.summary}, ${draft.imageUrl}, ${draft.tags}, ${draft.telegramMessageId}, ${draft.rawText}, 1
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
      ai_format_version = 1,
      saved_at = NOW()
  `
}

export type KeepForReformat = {
  id: string
  href: string
  title: string
  summary: string
  rawText: string
  telegramMessageId: number
  tags: string[]
}

export async function listKeepsForReformat(
  includeFormatted = false
): Promise<KeepForReformat[]> {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT id, href, title, summary, raw_text, telegram_message_id, tags
    FROM keeps
    WHERE ${includeFormatted} = TRUE OR ai_format_version < 1
    ORDER BY saved_at ASC
  `) as Array<{
    id: string
    href: string
    title: string
    summary: string
    raw_text: string
    telegram_message_id: string | number
    tags: string[]
  }>

  return rows.map((row) => ({
    id: row.id,
    href: row.href,
    title: row.title,
    summary: row.summary,
    rawText: row.raw_text,
    telegramMessageId: Number(row.telegram_message_id),
    tags: row.tags,
  }))
}

export async function updateKeepEditorial(
  id: string,
  draft: Pick<
    KeepDraft,
    "href" | "source" | "author" | "title" | "summary" | "imageUrl" | "tags"
  >
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()

  await sql`
    UPDATE keeps
    SET href = ${draft.href}, source = ${draft.source}, author = ${draft.author},
      title = ${draft.title}, summary = ${draft.summary},
      image_url = COALESCE(${draft.imageUrl}, image_url), tags = ${draft.tags},
      ai_format_version = 1
    WHERE id = ${id}
  `
}

export async function listInstagramPreviewsForStorage() {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()

  return (await sql`
    SELECT id, href, image_url
    FROM keeps
    WHERE source = 'Instagram' AND image_url IS NOT NULL
    ORDER BY saved_at ASC
  `) as Array<{ id: string; href: string; image_url: string }>
}

export async function updateKeepImageUrl(id: string, imageUrl: string) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()
  await sql`UPDATE keeps SET image_url = ${imageUrl} WHERE id = ${id}`
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
