import { neon } from "@neondatabase/serverless"
import { unstable_cache } from "next/cache"

import type { Perspective, Rant, RantDraft } from "@/lib/rants/types"

let schemaReady: Promise<void> | undefined

function database() {
  const url = process.env.DATABASE_URL?.trim()
  return url ? neon(url) : null
}

async function ensureSchema() {
  const sql = database()
  if (!sql) return

  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS rants (
        id TEXT PRIMARY KEY,
        telegram_message_id BIGINT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT NOT NULL,
        seo_description TEXT NOT NULL,
        body_html TEXT NOT NULL,
        body_text TEXT NOT NULL,
        tags TEXT[] NOT NULL DEFAULT '{}',
        reading_minutes INTEGER NOT NULL DEFAULT 1,
        published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS rants_status_published_at_idx
      ON rants (status, published_at DESC)
    `
    await sql`
      CREATE TABLE IF NOT EXISTS rant_perspectives (
        id TEXT PRIMARY KEY,
        rant_id TEXT NOT NULL REFERENCES rants(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        email TEXT,
        body TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        submitter_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS rant_perspectives_rant_status_idx
      ON rant_perspectives (rant_id, status, created_at ASC)
    `
  })()

  await schemaReady
}

type RantRow = {
  id: string
  telegram_message_id: string | number
  status: "draft" | "published"
  title: string
  slug: string
  excerpt: string
  seo_description: string
  body_html: string
  body_text: string
  tags: string[]
  reading_minutes: number
  published_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

function toRant(row: RantRow): Rant {
  return {
    id: row.id,
    telegramMessageId: Number(row.telegram_message_id),
    status: row.status,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    seoDescription: row.seo_description,
    bodyHtml: row.body_html,
    bodyText: row.body_text,
    tags: row.tags,
    readingMinutes: row.reading_minutes,
    publishedAt: row.published_at
      ? new Date(row.published_at).toISOString()
      : null,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  }
}

async function uniqueSlug(baseSlug: string, telegramMessageId: number) {
  const sql = database()
  if (!sql) return baseSlug
  const rows = await sql`
    SELECT telegram_message_id FROM rants WHERE slug = ${baseSlug} LIMIT 1
  `
  if (!rows.length || Number(rows[0].telegram_message_id) === telegramMessageId)
    return baseSlug
  return `${baseSlug}-${telegramMessageId}`
}

export async function saveRantDraft(draft: RantDraft) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()
  const slug = await uniqueSlug(draft.slug, draft.telegramMessageId)
  const id = crypto.randomUUID()

  const rows = (await sql`
    INSERT INTO rants (
      id, telegram_message_id, title, slug, excerpt, seo_description,
      body_html, body_text, tags, reading_minutes
    ) VALUES (
      ${id}, ${draft.telegramMessageId}, ${draft.title}, ${slug},
      ${draft.excerpt}, ${draft.seoDescription}, ${draft.bodyHtml},
      ${draft.bodyText}, ${draft.tags}, ${draft.readingMinutes}
    )
    ON CONFLICT (telegram_message_id) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      excerpt = EXCLUDED.excerpt,
      seo_description = EXCLUDED.seo_description,
      body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text,
      tags = EXCLUDED.tags,
      reading_minutes = EXCLUDED.reading_minutes,
      updated_at = NOW()
    RETURNING *
  `) as RantRow[]

  return toRant(rows[0])
}

export async function publishRantByTelegramMessageId(messageId: number) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()
  const rows = (await sql`
    UPDATE rants SET
      status = 'published',
      published_at = COALESCE(published_at, NOW()),
      updated_at = NOW()
    WHERE telegram_message_id = ${messageId}
    RETURNING *
  `) as RantRow[]
  return rows[0] ? toRant(rows[0]) : null
}

export async function deleteRantByTelegramMessageId(messageId: number) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()
  const rows = await sql`
    DELETE FROM rants WHERE telegram_message_id = ${messageId} RETURNING id
  `
  return rows.length > 0
}

async function listPublishedRantsFresh() {
  const sql = database()
  if (!sql) return []
  await ensureSchema()
  const rows = (await sql`
    SELECT * FROM rants
    WHERE status = 'published'
    ORDER BY published_at DESC, created_at DESC
    LIMIT 200
  `) as RantRow[]
  return rows.map(toRant)
}

export const listPublishedRants = unstable_cache(
  listPublishedRantsFresh,
  ["published-rants"],
  { tags: ["rants"], revalidate: 86400 }
)

export async function getPublishedRantBySlug(slug: string) {
  const sql = database()
  if (!sql) return null
  await ensureSchema()
  const rows = (await sql`
    SELECT * FROM rants
    WHERE slug = ${slug} AND status = 'published'
    LIMIT 1
  `) as RantRow[]
  return rows[0] ? toRant(rows[0]) : null
}

export async function getRantById(id: string) {
  const sql = database()
  if (!sql) return null
  await ensureSchema()
  const rows =
    (await sql`SELECT * FROM rants WHERE id = ${id} LIMIT 1`) as RantRow[]
  return rows[0] ? toRant(rows[0]) : null
}

type PerspectiveRow = {
  id: string
  rant_id: string
  name: string
  body: string
  created_at: string | Date
}

function toPerspective(row: PerspectiveRow): Perspective {
  return {
    id: row.id,
    rantId: row.rant_id,
    name: row.name,
    body: row.body,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function listApprovedPerspectives(rantId: string) {
  const sql = database()
  if (!sql) return []
  await ensureSchema()
  const rows = (await sql`
    SELECT id, rant_id, name, body, created_at
    FROM rant_perspectives
    WHERE rant_id = ${rantId} AND status = 'approved'
    ORDER BY created_at ASC
  `) as PerspectiveRow[]
  return rows.map(toPerspective)
}

export async function createPerspective(input: {
  rantId: string
  name: string
  email: string | null
  body: string
  submitterHash: string
}) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()

  const recent = await sql`
    SELECT id FROM rant_perspectives
    WHERE submitter_hash = ${input.submitterHash}
      AND created_at > NOW() - INTERVAL '10 minutes'
    LIMIT 1
  `
  if (recent.length) return { status: "rate_limited" as const }

  const id = crypto.randomUUID()
  await sql`
    INSERT INTO rant_perspectives (
      id, rant_id, name, email, body, submitter_hash
    ) VALUES (
      ${id}, ${input.rantId}, ${input.name}, ${input.email},
      ${input.body}, ${input.submitterHash}
    )
  `
  return { status: "created" as const, id }
}

export async function moderatePerspective(
  id: string,
  status: "approved" | "rejected"
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureSchema()
  const rows = await sql`
    UPDATE rant_perspectives
    SET status = ${status}, reviewed_at = NOW()
    WHERE id = ${id} AND status = 'pending'
    RETURNING rant_id
  `
  return rows[0]?.rant_id ? String(rows[0].rant_id) : null
}
