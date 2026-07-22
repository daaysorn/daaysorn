import { createHash } from "node:crypto"
import { extname } from "node:path"
import sharp from "sharp"

import { r2Files, r2PublicBaseUrl } from "@/lib/files"
import { galleryMediaExists, saveGalleryMedia } from "@/lib/gallery/db"
import type {
  GalleryMediaDraft,
  TelegramGalleryAttachment,
} from "@/lib/gallery/types"

const maxTelegramDownloadBytes = 20 * 1024 * 1024
let cachedTelegramToken: string | null | undefined

function telegramToken() {
  const telegramToken = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!telegramToken) return null
  return telegramToken
}

export async function deleteGalleryObjects(objectKeys: string[]) {
  if (!objectKeys.length) return

  const files = r2Files()
  if (!files)
    throw new Error("Gallery storage environment variables are incomplete")
  await files.delete(objectKeys)
}

async function downloadTelegramFile(fileId: string) {
  if (cachedTelegramToken === undefined) cachedTelegramToken = telegramToken()
  if (!cachedTelegramToken) {
    throw new Error("Gallery storage environment variables are incomplete")
  }

  const token = cachedTelegramToken
  const fileResponse = await fetch(
    `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`
  )
  const fileResult = (await fileResponse.json()) as {
    ok: boolean
    result?: { file_path?: string; file_size?: number }
  }

  if (!fileResponse.ok || !fileResult.ok || !fileResult.result?.file_path) {
    throw new Error("Telegram could not prepare that media file")
  }
  if ((fileResult.result.file_size ?? 0) > maxTelegramDownloadBytes) {
    throw new Error("Telegram media exceeds the 20 MB bot download limit")
  }

  const response = await fetch(
    `https://api.telegram.org/file/bot${token}/${fileResult.result.file_path}`
  )
  if (!response.ok) throw new Error("Telegram media download failed")
  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > maxTelegramDownloadBytes) {
    throw new Error("Telegram media exceeds the 20 MB bot download limit")
  }

  const buffer = Buffer.from(await response.arrayBuffer())
  if (buffer.byteLength > maxTelegramDownloadBytes) {
    throw new Error("Telegram media exceeds the 20 MB bot download limit")
  }

  return { buffer, filePath: fileResult.result.file_path }
}

async function uploadObject(key: string, body: Buffer, contentType: string) {
  const files = r2Files()
  const publicBaseUrl = r2PublicBaseUrl()
  if (!files || !publicBaseUrl) {
    throw new Error("Gallery storage environment variables are incomplete")
  }

  await files.upload(key, body, {
    contentType,
    cacheControl: "public, max-age=31536000, immutable",
  })

  return `${publicBaseUrl}/${key}`
}

function safeVideoExtension(mimeType: string, filePath: string) {
  if (mimeType === "video/webm") return "webm"
  if (mimeType === "video/ogg") return "ogv"
  if (mimeType === "video/quicktime") return "mov"
  const extension = extname(filePath).slice(1).toLowerCase()
  return ["m4v", "mov", "mp4", "ogv", "webm"].includes(extension)
    ? extension
    : "mp4"
}

export async function processGalleryAttachment(
  attachment: TelegramGalleryAttachment,
  caption: string,
  destinations: { gallery: boolean; instagram: boolean }
): Promise<
  { status: "added"; media: GalleryMediaDraft } | { status: "duplicate" }
> {
  if (await galleryMediaExists(attachment.fileUniqueId)) {
    return { status: "duplicate" }
  }

  const { buffer, filePath } = await downloadTelegramFile(attachment.fileId)
  const contentHash = createHash("sha256").update(buffer).digest("hex")
  if (await galleryMediaExists(attachment.fileUniqueId, contentHash)) {
    return { status: "duplicate" }
  }

  const id = crypto.randomUUID()
  const objectKeys: string[] = []
  const baseKey = `gallery/${contentHash}`
  const altText = caption.trim() || `Gallery ${attachment.type}`
  let width = attachment.width
  let height = attachment.height
  let smallUrl: string | null = null
  let mediumUrl: string | null = null
  let largeUrl: string | null = null
  let mediaUrl: string | null = null
  let posterUrl: string | null = null
  let storedMimeType = attachment.mimeType

  if (attachment.type === "image") {
    const image = sharp(buffer, { animated: false }).rotate()
    const metadata = await image.metadata()
    width = metadata.width ?? width
    height = metadata.height ?? height

    const variants = [
      ["small", 480],
      ["medium", 960],
      ["large", 1600],
    ] as const
    const urls = await Promise.all(
      variants.map(async ([name, variantWidth]) => {
        const key = `${baseKey}/${name}.webp`
        const output = await sharp(buffer, { animated: false })
          .rotate()
          .resize({ width: variantWidth, withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer()
        objectKeys.push(key)
        return uploadObject(key, output, "image/webp")
      })
    )
    ;[smallUrl, mediumUrl, largeUrl] = urls
    storedMimeType = "image/webp"
  } else {
    const extension = safeVideoExtension(attachment.mimeType, filePath)
    const key = `${baseKey}/video.${extension}`
    objectKeys.push(key)
    mediaUrl = await uploadObject(key, buffer, attachment.mimeType)

    if (attachment.thumbnailFileId) {
      const thumbnail = await downloadTelegramFile(attachment.thumbnailFileId)
      const posterKey = `${baseKey}/poster.webp`
      const poster = await sharp(thumbnail.buffer)
        .rotate()
        .resize({ width: 960, withoutEnlargement: true })
        .webp({ quality: 80, effort: 4 })
        .toBuffer()
      objectKeys.push(posterKey)
      posterUrl = await uploadObject(posterKey, poster, "image/webp")
    }
  }

  const draft: GalleryMediaDraft = {
    id,
    type: attachment.type,
    contentHash,
    telegramFileUniqueId: attachment.fileUniqueId,
    telegramMessageId: attachment.telegramMessageId,
    caption: caption.trim(),
    altText,
    mimeType: storedMimeType,
    width,
    height,
    smallUrl,
    mediumUrl,
    largeUrl,
    mediaUrl,
    posterUrl,
    objectKeys,
    createdAt: new Date().toISOString(),
  }

  const saved = await saveGalleryMedia(draft, destinations)
  return saved ? { status: "added", media: draft } : { status: "duplicate" }
}
