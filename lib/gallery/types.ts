export type GalleryMediaType = "image" | "video"

export type GalleryMedia = {
  id: string
  type: GalleryMediaType
  caption: string
  altText: string
  width: number | null
  height: number | null
  smallUrl: string | null
  mediumUrl: string | null
  largeUrl: string | null
  mediaUrl: string | null
  posterUrl: string | null
  createdAt: string
}

export type TelegramGalleryAttachment = {
  type: GalleryMediaType
  fileId: string
  fileUniqueId: string
  mimeType: string
  fileSize: number | null
  width: number | null
  height: number | null
  thumbnailFileId: string | null
  telegramMessageId: number
}

export type GalleryMediaDraft = GalleryMedia & {
  contentHash: string
  telegramFileUniqueId: string
  telegramMessageId: number
  mimeType: string
  objectKeys: string[]
}
