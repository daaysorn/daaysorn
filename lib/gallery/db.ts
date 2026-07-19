import { neon } from "@neondatabase/serverless"

import type {
  GalleryMedia,
  GalleryMediaDraft,
  TelegramGalleryAttachment,
} from "@/lib/gallery/types"

let gallerySchemaReady: Promise<void> | undefined

function database() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  return databaseUrl ? neon(databaseUrl) : null
}

export async function migrateGallerySchema() {
  const sql = database()
  if (!sql) return

  gallerySchemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_media (
        id TEXT PRIMARY KEY,
        media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
        content_hash TEXT NOT NULL UNIQUE,
        telegram_file_unique_id TEXT NOT NULL UNIQUE,
        telegram_message_id BIGINT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        alt_text TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        width INTEGER,
        height INTEGER,
        small_url TEXT,
        medium_url TEXT,
        large_url TEXT,
        media_url TEXT,
        poster_url TEXT,
        object_keys TEXT[] NOT NULL DEFAULT '{}',
        show_in_gallery BOOLEAN NOT NULL DEFAULT TRUE,
        publish_to_instagram BOOLEAN NOT NULL DEFAULT FALSE,
        buffer_post_id TEXT,
        buffer_published_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      ALTER TABLE gallery_media
      ADD COLUMN IF NOT EXISTS show_in_gallery BOOLEAN NOT NULL DEFAULT TRUE,
      ADD COLUMN IF NOT EXISTS publish_to_instagram BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS buffer_post_id TEXT,
      ADD COLUMN IF NOT EXISTS buffer_published_at TIMESTAMPTZ
    `
    await sql`
      DROP INDEX IF EXISTS gallery_media_buffer_post_id_idx
    `
    await sql`
      CREATE INDEX IF NOT EXISTS gallery_media_buffer_post_id_idx
      ON gallery_media (buffer_post_id)
      WHERE buffer_post_id IS NOT NULL
    `
    await sql`
      CREATE INDEX IF NOT EXISTS gallery_media_created_at_idx
      ON gallery_media (created_at DESC)
    `
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_batches (
        batch_key TEXT PRIMARY KEY,
        chat_id BIGINT NOT NULL,
        caption TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE TABLE IF NOT EXISTS gallery_pending_media (
        batch_key TEXT NOT NULL REFERENCES gallery_batches(batch_key) ON DELETE CASCADE,
        telegram_message_id BIGINT NOT NULL,
        media_type TEXT NOT NULL,
        file_id TEXT NOT NULL,
        file_unique_id TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        file_size BIGINT,
        width INTEGER,
        height INTEGER,
        thumbnail_file_id TEXT,
        PRIMARY KEY (batch_key, file_unique_id)
      )
    `
  })()

  await gallerySchemaReady
}

// Schema changes belong to the explicit migration command, never a request.
async function ensureGallerySchema() {}

type GalleryRow = {
  id: string
  media_type: "image" | "video"
  caption: string
  alt_text: string
  width: number | null
  height: number | null
  small_url: string | null
  medium_url: string | null
  large_url: string | null
  media_url: string | null
  poster_url: string | null
  created_at: string | Date
}

function toGalleryMedia(row: GalleryRow): GalleryMedia {
  return {
    id: row.id,
    type: row.media_type,
    caption: row.caption,
    altText: row.alt_text,
    width: row.width,
    height: row.height,
    smallUrl: row.small_url,
    mediumUrl: row.medium_url,
    largeUrl: row.large_url,
    mediaUrl: row.media_url,
    posterUrl: row.poster_url,
    createdAt: new Date(row.created_at).toISOString(),
  }
}

export async function listGalleryMediaFresh(): Promise<GalleryMedia[]> {
  const sql = database()
  if (!sql) return []

  const rows = (await sql`
    SELECT id, media_type, caption, alt_text, width, height, small_url,
      medium_url, large_url, media_url, poster_url, created_at
    FROM gallery_media
    WHERE show_in_gallery = TRUE
    ORDER BY created_at DESC, telegram_message_id ASC
    LIMIT 200
  `) as GalleryRow[]

  return rows.map(toGalleryMedia)
}

export const listGalleryMedia = listGalleryMediaFresh

export async function galleryMediaExists(
  telegramFileUniqueId: string,
  contentHash?: string
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = contentHash
    ? await sql`
        SELECT id FROM gallery_media
        WHERE telegram_file_unique_id = ${telegramFileUniqueId}
          OR content_hash = ${contentHash}
        LIMIT 1
      `
    : await sql`
        SELECT id FROM gallery_media
        WHERE telegram_file_unique_id = ${telegramFileUniqueId}
        LIMIT 1
      `

  return rows.length > 0
}

export async function saveGalleryMedia(
  draft: GalleryMediaDraft,
  destinations: { gallery: boolean; instagram: boolean } = {
    gallery: true,
    instagram: false,
  }
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = await sql`
    INSERT INTO gallery_media (
      id, media_type, content_hash, telegram_file_unique_id,
      telegram_message_id, caption, alt_text, mime_type, width, height,
      small_url, medium_url, large_url, media_url, poster_url, object_keys,
      show_in_gallery, publish_to_instagram
    ) VALUES (
      ${draft.id}, ${draft.type}, ${draft.contentHash},
      ${draft.telegramFileUniqueId}, ${draft.telegramMessageId},
      ${draft.caption}, ${draft.altText}, ${draft.mimeType}, ${draft.width},
      ${draft.height}, ${draft.smallUrl}, ${draft.mediumUrl},
      ${draft.largeUrl}, ${draft.mediaUrl}, ${draft.posterUrl},
      ${draft.objectKeys}, ${destinations.gallery}, ${destinations.instagram}
    )
    ON CONFLICT DO NOTHING
    RETURNING id
  `

  return rows.length > 0
}

type GalleryBufferRow = GalleryRow & {
  content_hash: string
  telegram_file_unique_id: string
  telegram_message_id: string | number
  mime_type: string
  object_keys: string[]
}

export async function listGalleryMediaPendingBuffer(limit = 20) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()

  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 50)
  const rows = (await sql`
    SELECT id, media_type, content_hash, telegram_file_unique_id,
      telegram_message_id, caption, alt_text, mime_type, width, height,
      small_url, medium_url, large_url, media_url, poster_url, object_keys,
      created_at
    FROM gallery_media
    WHERE buffer_post_id IS NULL AND publish_to_instagram = TRUE
    ORDER BY created_at ASC, telegram_message_id ASC
    LIMIT ${boundedLimit}
  `) as GalleryBufferRow[]

  return rows.map((row): GalleryMediaDraft => ({
    ...toGalleryMedia(row),
    contentHash: row.content_hash,
    telegramFileUniqueId: row.telegram_file_unique_id,
    telegramMessageId: Number(row.telegram_message_id),
    mimeType: row.mime_type,
    objectKeys: row.object_keys,
  }))
}

export async function markGalleryMediaPublishedToBuffer(
  galleryMediaId: string,
  bufferPostId: string
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()

  await sql`
    UPDATE gallery_media
    SET buffer_post_id = ${bufferPostId}, buffer_published_at = NOW()
    WHERE id = ${galleryMediaId} AND buffer_post_id IS NULL
  `
}

export async function markGalleryMediaBatchPublishedToBuffer(
  galleryMediaIds: string[],
  bufferPostId: string
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()
  if (!galleryMediaIds.length) return

  await sql`
    UPDATE gallery_media
    SET buffer_post_id = ${bufferPostId}, buffer_published_at = NOW()
    WHERE id = ANY(${galleryMediaIds}) AND buffer_post_id IS NULL
  `
}

export async function deleteGalleryMedia({
  telegramMessageId,
  telegramFileUniqueId,
}: {
  telegramMessageId?: number
  telegramFileUniqueId?: string
}) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()

  if (telegramMessageId === undefined && !telegramFileUniqueId) return null

  const rows = (await sql`
    DELETE FROM gallery_media
    WHERE (${telegramMessageId ?? null}::BIGINT IS NOT NULL
        AND telegram_message_id = ${telegramMessageId ?? null})
      OR (${telegramFileUniqueId ?? null}::TEXT IS NOT NULL
        AND telegram_file_unique_id = ${telegramFileUniqueId ?? null})
    RETURNING object_keys
  `) as Array<{ object_keys: string[] }>

  return rows[0]?.object_keys ?? null
}

export async function queueGalleryAttachment(
  batchKey: string,
  chatId: number,
  caption: string,
  attachment: TelegramGalleryAttachment
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()

  await sql`
    INSERT INTO gallery_batches (batch_key, chat_id, caption)
    VALUES (${batchKey}, ${chatId}, ${caption})
    ON CONFLICT (batch_key) DO UPDATE SET
      caption = CASE
        WHEN EXCLUDED.caption <> '' THEN EXCLUDED.caption
        ELSE gallery_batches.caption
      END,
      status = 'pending',
      updated_at = NOW()
  `
  await sql`
    INSERT INTO gallery_pending_media (
      batch_key, telegram_message_id, media_type, file_id, file_unique_id,
      mime_type, file_size, width, height, thumbnail_file_id
    ) VALUES (
      ${batchKey}, ${attachment.telegramMessageId}, ${attachment.type},
      ${attachment.fileId}, ${attachment.fileUniqueId},
      ${attachment.mimeType}, ${attachment.fileSize}, ${attachment.width},
      ${attachment.height}, ${attachment.thumbnailFileId}
    )
    ON CONFLICT (batch_key, file_unique_id) DO NOTHING
  `
}

type PendingRow = {
  telegram_message_id: string | number
  media_type: "image" | "video"
  file_id: string
  file_unique_id: string
  mime_type: string
  file_size: string | number | null
  width: number | null
  height: number | null
  thumbnail_file_id: string | null
  caption: string
  chat_id: string | number
}

export async function claimGalleryBatch(batchKey: string) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")
  await ensureGallerySchema()

  const claimed = await sql`
    UPDATE gallery_batches
    SET status = 'processing'
    WHERE batch_key = ${batchKey}
      AND status = 'pending'
      AND updated_at <= NOW() - INTERVAL '1500 milliseconds'
    RETURNING batch_key
  `
  if (!claimed.length) return null

  const rows = (await sql`
    SELECT pending.telegram_message_id, pending.media_type, pending.file_id,
      pending.file_unique_id, pending.mime_type, pending.file_size,
      pending.width, pending.height, pending.thumbnail_file_id,
      batches.caption, batches.chat_id
    FROM gallery_pending_media AS pending
    JOIN gallery_batches AS batches ON batches.batch_key = pending.batch_key
    WHERE pending.batch_key = ${batchKey}
    ORDER BY pending.telegram_message_id ASC
  `) as PendingRow[]

  if (!rows.length) return null
  return {
    chatId: Number(rows[0].chat_id),
    caption: rows[0].caption,
    attachments: rows.map((row): TelegramGalleryAttachment => ({
      type: row.media_type,
      fileId: row.file_id,
      fileUniqueId: row.file_unique_id,
      mimeType: row.mime_type,
      fileSize: row.file_size === null ? null : Number(row.file_size),
      width: row.width,
      height: row.height,
      thumbnailFileId: row.thumbnail_file_id,
      telegramMessageId: Number(row.telegram_message_id),
    })),
  }
}

export async function finishGalleryBatch(batchKey: string) {
  const sql = database()
  if (!sql) return
  await ensureGallerySchema()
  await sql`DELETE FROM gallery_batches WHERE batch_key = ${batchKey}`
}
