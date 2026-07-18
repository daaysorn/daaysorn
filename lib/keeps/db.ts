import { neon } from "@neondatabase/serverless"

import type { Keep, KeepDraft } from "@/lib/keeps/types"

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
        tags TEXT[] NOT NULL DEFAULT '{}',
        telegram_message_id BIGINT NOT NULL UNIQUE,
        raw_text TEXT NOT NULL,
        saved_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS keeps_saved_at_idx
      ON keeps (saved_at DESC)
    `
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
  tags: string[]
  saved_at: string | Date
}

function toKeep(row: KeepRow): Keep {
  return {
    id: row.id,
    href: row.href,
    source: row.source,
    author: row.author,
    title: row.title,
    summary: row.summary,
    tags: row.tags,
    savedAt: new Intl.DateTimeFormat("en-NG", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      timeZone: "Africa/Lagos",
    }).format(new Date(row.saved_at)),
  }
}

export async function listKeeps(): Promise<Keep[]> {
  const sql = database()
  if (!sql) return []

  await ensureSchema()
  const rows = (await sql`
    SELECT id, href, source, author, title, summary, tags, saved_at
    FROM keeps
    ORDER BY saved_at DESC
    LIMIT 100
  `) as KeepRow[]

  return rows.map(toKeep)
}

export async function saveKeep(draft: KeepDraft) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  await ensureSchema()
  const id = crypto.randomUUID()

  await sql`
    INSERT INTO keeps (
      id, href, source, author, title, summary, tags,
      telegram_message_id, raw_text
    ) VALUES (
      ${id}, ${draft.href}, ${draft.source}, ${draft.author}, ${draft.title},
      ${draft.summary}, ${draft.tags}, ${draft.telegramMessageId}, ${draft.rawText}
    )
    ON CONFLICT (href) DO UPDATE SET
      source = EXCLUDED.source,
      author = EXCLUDED.author,
      title = EXCLUDED.title,
      summary = EXCLUDED.summary,
      tags = EXCLUDED.tags,
      telegram_message_id = EXCLUDED.telegram_message_id,
      raw_text = EXCLUDED.raw_text,
      saved_at = NOW()
  `
}
