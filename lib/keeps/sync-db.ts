import { createHash, randomBytes } from "node:crypto"

import { neon } from "@neondatabase/serverless"

let syncSchemaReady: Promise<void> | undefined

function database() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) return null
  return neon(databaseUrl)
}

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex")
}

async function ensureSyncSchema() {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  syncSchemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS keeps_sync_groups (
        id TEXT PRIMARY KEY,
        secret_hash TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS keeps_sync_items (
        group_id TEXT NOT NULL REFERENCES keeps_sync_groups(id) ON DELETE CASCADE,
        keep_id TEXT NOT NULL,
        saved BOOLEAN NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (group_id, keep_id)
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS keeps_sync_items_group_saved_idx
      ON keeps_sync_items (group_id, saved)
    `
  })()

  await syncSchemaReady
  return sql
}

export async function createKeepsSyncGroup(savedIds: string[]) {
  const sql = await ensureSyncSchema()
  const id = crypto.randomUUID()
  const secret = randomBytes(32).toString("base64url")

  await sql`
    INSERT INTO keeps_sync_groups (id, secret_hash)
    VALUES (${id}, ${hashSecret(secret)})
  `

  for (const keepId of savedIds) {
    await sql`
      INSERT INTO keeps_sync_items (group_id, keep_id, saved)
      VALUES (${id}, ${keepId}, TRUE)
      ON CONFLICT (group_id, keep_id) DO UPDATE SET
        saved = TRUE,
        updated_at = NOW()
    `
  }

  return { id, secret }
}

export async function authenticateKeepsSyncGroup(id: string, secret: string) {
  const sql = await ensureSyncSchema()
  const rows = await sql`
    SELECT id
    FROM keeps_sync_groups
    WHERE id = ${id} AND secret_hash = ${hashSecret(secret)}
    LIMIT 1
  `
  return rows.length > 0
}

export async function listSyncedKeepIds(groupId: string) {
  const sql = await ensureSyncSchema()
  const rows = (await sql`
    SELECT keep_id
    FROM keeps_sync_items
    WHERE group_id = ${groupId} AND saved = TRUE
    ORDER BY updated_at DESC
    LIMIT 500
  `) as { keep_id: string }[]
  return rows.map((row) => row.keep_id)
}

export async function applyKeepsSyncChanges(
  groupId: string,
  changes: { keepId: string; saved: boolean }[]
) {
  const sql = await ensureSyncSchema()

  for (const change of changes) {
    await sql`
      INSERT INTO keeps_sync_items (group_id, keep_id, saved)
      VALUES (${groupId}, ${change.keepId}, ${change.saved})
      ON CONFLICT (group_id, keep_id) DO UPDATE SET
        saved = EXCLUDED.saved,
        updated_at = NOW()
    `
  }

  await sql`
    UPDATE keeps_sync_groups
    SET updated_at = NOW()
    WHERE id = ${groupId}
  `
}
