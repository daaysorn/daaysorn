import { after } from "next/server"

import {
  claimGalleryBatch,
  deleteGalleryMedia,
  finishGalleryBatch,
  markGalleryMediaBatchPublishedToBuffer,
  queueGalleryAttachment,
} from "@/lib/gallery/db"
import { publishGalleryMediaToInstagram } from "@/lib/gallery/buffer"
import {
  deleteGalleryObjects,
  processGalleryAttachment,
} from "@/lib/gallery/storage"
import type { TelegramGalleryAttachment } from "@/lib/gallery/types"
import {
  parseGalleryPostInstructions,
  telegramBotHelp,
} from "@/lib/gallery/telegram"
import { deleteKeepByHref, saveKeep } from "@/lib/keeps/db"
import { enrichKeep } from "@/lib/keeps/enrich"
import { normalizeKeepUrl } from "@/lib/keeps/url"
import { publishPublicKeepsChanged } from "@/lib/keeps/realtime"
import { listRecentKeepsSyncGroups } from "@/lib/keeps/sync-db"
import {
  deletePerspectiveById,
  deletePerspectiveBySlugAndName,
  deleteRantByTelegramMessageId,
  moderatePerspective,
  moderatePerspectiveEdit,
  publishRantById,
  publishRantByTelegramMessageId,
  saveRantDraft,
} from "@/lib/rants/db"
import {
  estimateReadingMinutes,
  generateRantMetadata,
} from "@/lib/rants/enrich"
import { stripRantCommand } from "@/lib/rants/format"
import { createRantPreviewToken } from "@/lib/rants/preview"
import { publishRantsChanged } from "@/lib/rants/realtime"
import type { TelegramTextEntity } from "@/lib/rants/types"
import { siteConfig } from "@/lib/seo"

export const maxDuration = 60

type TelegramEntity = {
  type: string
  offset: number
  length: number
  url?: string
}

type TelegramPhoto = {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  file_size?: number
}

type TelegramVideo = {
  file_id: string
  file_unique_id: string
  width: number
  height: number
  duration: number
  mime_type?: string
  file_size?: number
  thumbnail?: TelegramPhoto
}

type TelegramDocument = {
  file_id: string
  file_unique_id: string
  mime_type?: string
  file_size?: number
  thumbnail?: TelegramPhoto
}

type TelegramMessage = {
  message_id: number
  text?: string
  caption?: string
  entities?: TelegramEntity[]
  caption_entities?: TelegramEntity[]
  photo?: TelegramPhoto[]
  video?: TelegramVideo
  document?: TelegramDocument
  media_group_id?: string
  chat: { id: number }
  from?: { id: number }
  reply_to_message?: TelegramMessage
}

function findGalleryAttachment(
  message: TelegramMessage
): TelegramGalleryAttachment | null {
  if (message.photo?.length) {
    const photo = [...message.photo].sort(
      (a, b) => b.width * b.height - a.width * a.height
    )[0]
    return {
      type: "image",
      fileId: photo.file_id,
      fileUniqueId: photo.file_unique_id,
      mimeType: "image/jpeg",
      fileSize: photo.file_size ?? null,
      width: photo.width,
      height: photo.height,
      thumbnailFileId: null,
      telegramMessageId: message.message_id,
    }
  }

  if (message.video) {
    return {
      type: "video",
      fileId: message.video.file_id,
      fileUniqueId: message.video.file_unique_id,
      mimeType: message.video.mime_type ?? "video/mp4",
      fileSize: message.video.file_size ?? null,
      width: message.video.width,
      height: message.video.height,
      thumbnailFileId: message.video.thumbnail?.file_id ?? null,
      telegramMessageId: message.message_id,
    }
  }

  const mimeType = message.document?.mime_type ?? ""
  if (message.document && /^(?:image|video)\//i.test(mimeType)) {
    return {
      type: mimeType.startsWith("video/") ? "video" : "image",
      fileId: message.document.file_id,
      fileUniqueId: message.document.file_unique_id,
      mimeType,
      fileSize: message.document.file_size ?? null,
      width: null,
      height: null,
      thumbnailFileId: message.document.thumbnail?.file_id ?? null,
      telegramMessageId: message.message_id,
    }
  }

  return null
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
  callback_query?: {
    id: string
    from: { id: number }
    data?: string
    message?: TelegramMessage
  }
}

function findLinks(message: TelegramMessage): string[] {
  const entities = [
    ...(message.entities ?? []),
    ...(message.caption_entities ?? []),
  ]
  const entityLinks = entities.flatMap((entity) =>
    entity.type === "text_link" && entity.url ? [entity.url] : []
  )
  const directLinks = [
    ...(message.text ?? message.caption ?? "").matchAll(
      /https?:\/\/[^\s<>]+/gi
    ),
  ].map((match) => match[0].replace(/[),.;!?\]}]+$/g, ""))
  const replyLinks =
    !entityLinks.length && !directLinks.length && message.reply_to_message
      ? findLinks(message.reply_to_message)
      : []

  return [
    ...new Set(
      [...entityLinks, ...directLinks, ...replyLinks].flatMap((href) => {
        try {
          return [normalizeKeepUrl(href)]
        } catch {
          return []
        }
      })
    ),
  ].slice(0, 5)
}

function findCustomTags(text: string) {
  return [
    ...new Set(
      [...text.matchAll(/(?:^|\s)#([\p{L}\p{N}_-]{2,24})/gu)].map((match) =>
        match[1].replace(/[_-]+/g, " ").trim()
      )
    ),
  ].slice(0, 5)
}

function telegramFailureReason(reason: unknown) {
  const message =
    reason instanceof Error
      ? reason.message
      : typeof reason === "string"
        ? reason
        : "An unknown error occurred"

  const sanitized = message
    .replace(/\b(?:postgres(?:ql)?|https?):\/\/[^\s@]+@/gi, (value) => {
      const protocol = value.slice(0, value.indexOf("://") + 3)
      return `${protocol}[credentials hidden]@`
    })
    .replace(/\b(Bearer|Basic)\s+\S+/gi, "$1 [credentials hidden]")
    .replace(
      /\b(api[_-]?key|token|secret|password)\s*[:=]\s*[^\s,;]+/gi,
      "$1=[credentials hidden]"
    )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500)

  return sanitized || "An unknown error occurred"
}

async function reply(
  chatId: number,
  text: string,
  options?: {
    parseMode?: "HTML"
    inlineKeyboard?: Array<Array<{ text: string; callbackData: string }>>
  }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      link_preview_options: { is_disabled: true },
      reply_markup: options?.inlineKeyboard
        ? {
            inline_keyboard: options.inlineKeyboard.map((row) =>
              row.map((button) => ({
                text: button.text,
                callback_data: button.callbackData,
              }))
            ),
          }
        : undefined,
    }),
  })
}

async function answerCallbackQuery(id: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ callback_query_id: id, text }),
  })
}

async function notifyPublicKeepsChanged() {
  try {
    await publishPublicKeepsChanged()
  } catch (error) {
    console.error("Public Keeps realtime publish failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

async function notifyRantsChanged(rantId: string) {
  try {
    await publishRantsChanged(rantId)
  } catch (error) {
    console.error("Rants realtime publish failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
  }
}

function findRantPreviewId(text: string) {
  return text.match(
    /\/rants\/preview\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?:[/?#]|$)/i
  )?.[1]
}

async function processGalleryMedia(
  chatId: number,
  rawText: string,
  attachments: TelegramGalleryAttachment[]
) {
  const instructions = parseGalleryPostInstructions(rawText)
  if (
    instructions.destinations.instagram &&
    attachments.length > 1 &&
    (attachments.length > 10 ||
      attachments.some((attachment) => attachment.type !== "image"))
  ) {
    await reply(
      chatId,
      attachments.length > 10
        ? "Instagram carousels can contain at most 10 photos. Please send a smaller album."
        : "Instagram carousels can only contain photos, not videos or mixed media."
    )
    return
  }

  const results: Array<
    Awaited<ReturnType<typeof processGalleryAttachment>> | { status: "failed" }
  > = []
  for (let index = 0; index < attachments.length; index += 2) {
    const batch = attachments.slice(index, index + 2)
    const processed = await Promise.all(
      batch.map(async (attachment) => {
        try {
          return await processGalleryAttachment(
            attachment,
            instructions.caption,
            instructions.destinations
          )
        } catch (error) {
          console.error("Gallery media processing failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            telegramMessageId: attachment.telegramMessageId,
          })
          return { status: "failed" as const }
        }
      })
    )
    results.push(...processed)
  }

  const addedMedia = results.flatMap((result) =>
    result.status === "added" ? [result.media] : []
  )
  const added = addedMedia.length
  const duplicates = results.filter(
    (result) => result.status === "duplicate"
  ).length
  let failed = results.filter((result) => result.status === "failed").length
  let instagramPublished = false
  if (addedMedia.length && instructions.destinations.instagram) {
    try {
      const published = await publishGalleryMediaToInstagram(
        addedMedia,
        instructions.caption
      )
      if (published === "unconfigured") {
        throw new Error("Buffer is not configured")
      }
      await markGalleryMediaBatchPublishedToBuffer(
        addedMedia.map((media) => media.id),
        published.postId
      )
      instagramPublished = true
    } catch (error) {
      failed += 1
      console.error("Buffer Instagram publishing failed", {
        message: error instanceof Error ? error.message : "Unknown error",
        galleryMediaIds: addedMedia.map((media) => media.id),
      })
    }
  }

  const notes = [
    added && instructions.destinations.gallery
      ? `${added} added to Gallery`
      : "",
    instagramPublished
      ? `${addedMedia.length > 1 ? "carousel" : "post"} sent to Instagram`
      : "",
    duplicates ? `${duplicates} already received` : "",
    failed ? `${failed} failed` : "",
  ].filter(Boolean)
  await reply(
    chatId,
    notes.length ? `${notes.join(", ")}.` : "Nothing was added."
  )
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token")

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const update = (await request.json()) as TelegramUpdate
  const callback = update.callback_query
  if (callback) {
    const ownerId = Number(process.env.TELEGRAM_OWNER_ID)
    const chatId = callback.message?.chat.id
    if (!Number.isSafeInteger(ownerId) || callback.from.id !== ownerId) {
      return new Response("Forbidden", { status: 403 })
    }
    if (!chatId || !callback.data) return Response.json({ ok: true })

    const publish = callback.data.match(/^publish_rant:([0-9a-f-]{36})$/i)
    const moderation = callback.data.match(
      /^(approve|reject)_perspective:([0-9a-f-]{36})$/i
    )
    const editModeration = callback.data.match(
      /^(approve|reject)_edit:([0-9a-f-]{36})$/i
    )
    const deletePerspective = callback.data.match(
      /^delete_perspective:([0-9a-f-]{36})$/i
    )
    after(async () => {
      if (publish) {
        const rant = await publishRantById(publish[1])
        if (!rant) {
          await answerCallbackQuery(callback.id, "Rant draft not found.")
          return
        }
        await answerCallbackQuery(callback.id, "Rant published.")
        await reply(chatId, `Published: ${siteConfig.url}/rants/${rant.slug}`)
        return
      }

      if (moderation) {
        const status = moderation[1] === "approve" ? "approved" : "rejected"
        const rantId = await moderatePerspective(
          moderation[2],
          status as "approved" | "rejected"
        )
        if (!rantId) {
          await answerCallbackQuery(callback.id, "Already reviewed or missing.")
          return
        }
        await notifyRantsChanged(rantId)
        await answerCallbackQuery(callback.id, `Perspective ${status}.`)
        await reply(chatId, `Perspective ${status}.`)
        return
      }

      if (editModeration) {
        const status = editModeration[1] === "approve" ? "approved" : "rejected"
        const rantId = await moderatePerspectiveEdit(
          editModeration[2],
          status as "approved" | "rejected"
        )
        if (!rantId) {
          await answerCallbackQuery(
            callback.id,
            "Edit already reviewed or missing."
          )
          return
        }
        await notifyRantsChanged(rantId)
        await answerCallbackQuery(callback.id, `Perspective edit ${status}.`)
        await reply(chatId, `Perspective edit ${status}.`)
        return
      }

      if (deletePerspective) {
        const rantId = await deletePerspectiveById(deletePerspective[1])
        if (!rantId) {
          await answerCallbackQuery(callback.id, "Perspective already deleted.")
          return
        }
        await notifyRantsChanged(rantId)
        await answerCallbackQuery(callback.id, "Perspective deleted.")
        await reply(chatId, "Perspective deleted.")
        return
      }

      await answerCallbackQuery(
        callback.id,
        "This action is no longer available."
      )
    })
    return Response.json({ ok: true })
  }

  const message = update.message ?? update.edited_message ?? update.channel_post
  if (!message) return Response.json({ ok: true })

  const ownerId = Number(process.env.TELEGRAM_OWNER_ID)
  const senderId = message.from?.id ?? message.chat.id
  if (!Number.isSafeInteger(ownerId) || senderId !== ownerId) {
    return new Response("Forbidden", { status: 403 })
  }

  const rawText = message.text ?? message.caption ?? ""
  const galleryAttachment = findGalleryAttachment(message)
  const isDeleteKeepCommand = /^\/deletekeep(?:@\w+)?\b/i.test(rawText)
  const isDeleteGalleryCommand = /^\/deletegallery(?:@\w+)?\b/i.test(rawText)
  const isDeleteRantCommand = /^\/deleterant(?:@\w+)?\b/i.test(rawText)
  const isLegacyDeleteCommand = /^\/delete(?:@\w+)?\b/i.test(rawText)
  const isHelpCommand = /^\/(?:help|start)(?:@\w+)?\b/i.test(rawText)
  const isKeepCommand = /^\/keep(?:@\w+)?\b/i.test(rawText)
  const isRantCommand = /^\/rant(?:@\w+)?(?:\s|$)/i.test(rawText)
  const isMediaCommand =
    /^\/(?:gallery|insta|instagal(?:-|_)tag|instagal|intatag)(?:@\w+)?\b/i.test(
      rawText
    )

  if (isHelpCommand) {
    after(() => reply(message.chat.id, telegramBotHelp, { parseMode: "HTML" }))
    return Response.json({ ok: true })
  }

  if (isRantCommand) {
    const { bodyText, bodyHtml } = stripRantCommand(
      rawText,
      (message.entities ??
        message.caption_entities ??
        []) as TelegramTextEntity[]
    )
    if (bodyText.length < 30) {
      after(() =>
        reply(
          message.chat.id,
          "Write at least a few sentences after /rant so I can prepare the draft."
        )
      )
      return Response.json({ ok: true })
    }

    after(async () => {
      try {
        const metadata = await generateRantMetadata(bodyText)
        const rant = await saveRantDraft({
          telegramMessageId: message.message_id,
          ...metadata,
          bodyHtml,
          bodyText,
          readingMinutes: estimateReadingMinutes(bodyText),
        })
        const token = createRantPreviewToken(rant.id)
        const previewUrl = token
          ? `${siteConfig.url}/rants/preview/${rant.id}?token=${token}`
          : null
        await reply(
          message.chat.id,
          [
            `Rant draft: ${rant.title}`,
            `${rant.readingMinutes} min · ${rant.tags.join(", ")}`,
            previewUrl ? `Preview: ${previewUrl}` : "",
            "To update the draft, edit your original /rant message above.",
          ]
            .filter(Boolean)
            .join("\n"),
          {
            inlineKeyboard: [
              [
                {
                  text: "Publish Rant",
                  callbackData: `publish_rant:${rant.id}`,
                },
              ],
            ],
          }
        )
      } catch (error) {
        console.error("Rant draft creation failed", {
          message: error instanceof Error ? error.message : "Unknown error",
          telegramMessageId: message.message_id,
        })
        await reply(
          message.chat.id,
          "I could not save that Rant. Please try again."
        )
      }
    })
    return Response.json({ ok: true })
  }

  if (/^\/publish(?:@\w+)?\b/i.test(rawText)) {
    const repliedMessageId = message.reply_to_message?.message_id
    const previewId = findRantPreviewId(
      `${rawText}\n${message.reply_to_message?.text ?? ""}`
    )
    if (!repliedMessageId && !previewId) {
      after(() =>
        reply(
          message.chat.id,
          "Reply /publish to the original /rant message, or send /publish followed by its preview link."
        )
      )
      return Response.json({ ok: true })
    }
    after(async () => {
      const rant = previewId
        ? await publishRantById(previewId)
        : await publishRantByTelegramMessageId(repliedMessageId as number)
      if (!rant) {
        await reply(message.chat.id, "That message is not a Rant draft.")
        return
      }
      await reply(
        message.chat.id,
        `Published: ${siteConfig.url}/rants/${rant.slug}`
      )
    })
    return Response.json({ ok: true })
  }

  const moderation = rawText.match(
    /^\/(approve|reject)(?:@\w+)?\s+([0-9a-f-]{36})\s*$/i
  )
  if (moderation) {
    after(async () => {
      const status =
        moderation[1].toLowerCase() === "approve" ? "approved" : "rejected"
      const rantId = await moderatePerspective(
        moderation[2],
        status as "approved" | "rejected"
      )
      if (!rantId) {
        await reply(
          message.chat.id,
          "That Perspective is missing or already reviewed."
        )
        return
      }
      await notifyRantsChanged(rantId)
      await reply(message.chat.id, `Perspective ${status}.`)
    })
    return Response.json({ ok: true })
  }

  if (/^\/adminid(?:@\w+)?\s*$/i.test(rawText)) {
    after(async () => {
      const groups = await listRecentKeepsSyncGroups()
      const configured = process.env.RANTS_ADMIN_SYNC_ID?.trim()
      const currentAdmin = groups.find((group) => group.id === configured)
      const otherDevices = groups.filter((group) => group.id !== configured)
      await reply(
        message.chat.id,
        groups.length
          ? [
              "Admin access is ready.",
              "",
              configured
                ? `Current admin: ${currentAdmin?.display_name ?? "Unknown or older device"}\nAdmin ID: ${configured}\n\nYou do not need to change anything.`
                : "No admin device is configured yet. Choose a device below.",
              ...(otherDevices.length
                ? [
                    "",
                    "Other devices you can make admin:",
                    ...otherDevices.flatMap((group) => [
                      group.display_name ?? "Unnamed device",
                      `Device ID: ${group.id}`,
                    ]),
                  ]
                : []),
              "",
              "Only if you want to switch admin:",
              "1. Copy the Device ID you want.",
              "2. Set:",
              "RANTS_ADMIN_SYNC_ID=PASTE_ID_HERE",
              "3. Redeploy the site or restart the bot.",
            ].join("\n")
          : "No synced identities exist yet. Open Keeps or submit a Perspective first."
      )
    })
    return Response.json({ ok: true })
  }

  const deletePerspective = rawText.match(
    /^\/deleteperspective(?:@\w+)?\s+([^\s]+)\s+(.+?)\s*$/i
  )
  if (deletePerspective) {
    after(async () => {
      const slug = deletePerspective[1].trim()
      const commenterName = deletePerspective[2].trim().replace(/\s+/g, " ")
      const rantId = await deletePerspectiveBySlugAndName(slug, commenterName)
      if (!rantId) {
        await reply(
          message.chat.id,
          `No Perspective by “${commenterName}” was found on “${slug}”.`
        )
        return
      }
      await notifyRantsChanged(rantId)
      await reply(
        message.chat.id,
        `Deleted the newest Perspective by “${commenterName}” on “${slug}”.`
      )
    })
    return Response.json({ ok: true })
  }

  if (isDeleteRantCommand || isLegacyDeleteCommand) {
    const replied = message.reply_to_message
    const repliedText = replied?.text ?? replied?.caption ?? ""
    if (/^\/rant(?:@\w+)?(?:\s|$)/i.test(repliedText) && replied) {
      after(async () => {
        const deleted = await deleteRantByTelegramMessageId(replied.message_id)
        await reply(
          message.chat.id,
          deleted ? "Deleted that Rant." : "That message is not a saved Rant."
        )
      })
      return Response.json({ ok: true })
    }
    if (isDeleteRantCommand) {
      after(() =>
        reply(
          message.chat.id,
          "Reply /deleterant to the original /rant message."
        )
      )
      return Response.json({ ok: true })
    }
  }

  if (isDeleteGalleryCommand || isLegacyDeleteCommand) {
    const repliedGalleryMessage = message.reply_to_message
    const repliedGalleryAttachment = repliedGalleryMessage
      ? findGalleryAttachment(repliedGalleryMessage)
      : null
    const targetAttachment = galleryAttachment ?? repliedGalleryAttachment

    if (targetAttachment) {
      after(async () => {
        try {
          const objectKeys = await deleteGalleryMedia({
            telegramMessageId:
              repliedGalleryMessage?.message_id ?? message.message_id,
            telegramFileUniqueId: targetAttachment.fileUniqueId,
          })

          if (!objectKeys) {
            await reply(message.chat.id, "That media is not in Gallery.")
            return
          }

          try {
            await deleteGalleryObjects(objectKeys)
          } catch (error) {
            console.error("Gallery object cleanup failed", {
              message: error instanceof Error ? error.message : "Unknown error",
              telegramMessageId:
                repliedGalleryMessage?.message_id ?? message.message_id,
            })
          }
          await reply(message.chat.id, "Deleted from Gallery.")
        } catch (error) {
          console.error("Gallery deletion failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            telegramMessageId:
              repliedGalleryMessage?.message_id ?? message.message_id,
          })
          await reply(
            message.chat.id,
            "I could not delete that Gallery item. Please try again."
          )
        }
      })

      return Response.json({ ok: true })
    }

    if (isDeleteGalleryCommand) {
      after(() =>
        reply(
          message.chat.id,
          "Reply /deletegallery to the original Gallery photo or video message."
        )
      )
      return Response.json({ ok: true })
    }
  }

  if (galleryAttachment) {
    if ((galleryAttachment.fileSize ?? 0) > 20 * 1024 * 1024) {
      after(() =>
        reply(
          message.chat.id,
          "That media file is over Telegram's 20 MB bot download limit. Send a smaller version."
        )
      )
      return Response.json({ ok: true })
    }

    if (message.media_group_id) {
      const batchKey = `${message.chat.id}:${message.media_group_id}`
      after(async () => {
        try {
          await queueGalleryAttachment(
            batchKey,
            message.chat.id,
            rawText,
            galleryAttachment
          )
          await new Promise((resolve) => setTimeout(resolve, 2500))
          const batch = await claimGalleryBatch(batchKey)
          if (!batch) return
          await processGalleryMedia(
            batch.chatId,
            batch.caption,
            batch.attachments
          )
          await finishGalleryBatch(batchKey)
        } catch (error) {
          console.error("Gallery album processing failed", {
            message: error instanceof Error ? error.message : "Unknown error",
            mediaGroupId: message.media_group_id,
          })
          await reply(
            message.chat.id,
            "I could not add that Gallery album. Please try again."
          )
        }
      })
    } else {
      after(() =>
        processGalleryMedia(message.chat.id, rawText, [galleryAttachment])
      )
    }

    return Response.json({ ok: true })
  }

  if (isMediaCommand) {
    after(() =>
      reply(
        message.chat.id,
        "Attach a photo, video, or Telegram photo album and put the media command in its caption. Send /help for examples."
      )
    )
    return Response.json({ ok: true })
  }

  const hrefs = findLinks(message)

  if (isDeleteKeepCommand || isLegacyDeleteCommand) {
    if (!hrefs.length) {
      after(() =>
        reply(
          message.chat.id,
          isDeleteKeepCommand
            ? "Send /deletekeep followed by the Keep link, or reply /deletekeep to the original link message."
            : "Send /delete followed by a Keep link, or reply /delete to the original link, image, or video message."
        )
      )
      return Response.json({ ok: true })
    }

    after(async () => {
      try {
        const deleted = await Promise.all(
          hrefs.map((href) => deleteKeepByHref(href))
        )
        const deletedCount = deleted.filter(Boolean).length
        if (deletedCount) {
          await notifyPublicKeepsChanged()
        }
        await reply(
          message.chat.id,
          deletedCount
            ? `Deleted ${deletedCount} ${deletedCount === 1 ? "Keep" : "Keeps"}.`
            : "Those links are not in Keeps."
        )
      } catch (error) {
        console.error("Keeps deletion failed", {
          message: error instanceof Error ? error.message : "Unknown error",
          telegramMessageId: message.message_id,
        })
        await reply(
          message.chat.id,
          "I could not delete that Keep. Please try again."
        )
      }
    })

    return Response.json({ ok: true })
  }

  if (!hrefs.length) {
    after(() =>
      reply(
        message.chat.id,
        isKeepCommand
          ? "Send /keep followed by a post or page link. You can add optional #tags."
          : "Send me a post or page link to add it to Keeps. Send /help for every command."
      )
    )
    return Response.json({ ok: true })
  }

  const keepText = rawText || hrefs.join("\n")
  after(async () => {
    const customTags = findCustomTags(keepText)
    const results = await Promise.allSettled(
      hrefs.map(async (href) => {
        const keep = await enrichKeep({
          href,
          rawText: keepText,
          telegramMessageId: message.message_id,
          customTags,
        })
        await saveKeep(keep)
        return keep
      })
    )
    const saved = results.flatMap((result) =>
      result.status === "fulfilled" ? [result.value] : []
    )
    const failed = results.flatMap((result, index) =>
      result.status === "rejected"
        ? [
            {
              href: hrefs[index].slice(0, 200),
              linkIndex: index,
              reason: telegramFailureReason(result.reason),
            },
          ]
        : []
    )

    failed.forEach((failure) => {
      console.error("Keeps enrichment failed", {
        message: failure.reason,
        telegramMessageId: message.message_id,
        linkIndex: failure.linkIndex,
      })
    })

    if (!saved.length) {
      const reasons = failed
        .map((failure) =>
          hrefs.length === 1
            ? `Reason: ${failure.reason}`
            : `• ${failure.href}\n  ${failure.reason}`
        )
        .join("\n")
      await reply(
        message.chat.id,
        `I could not add ${hrefs.length === 1 ? "that link" : "those links"}.\n${reasons}`
      )
      return
    }

    await notifyPublicKeepsChanged()

    const titles = saved.map((keep) => `• ${keep.title}`).join("\n")
    const failureNote = failed.length
      ? `\n\nNot added:\n${failed
          .map((failure) => `• ${failure.href}\n  Reason: ${failure.reason}`)
          .join("\n")}`
      : ""
    await reply(
      message.chat.id,
      `Kept ${saved.length} ${saved.length === 1 ? "link" : "links"}:\n${titles}${failureNote}`
    )
  })

  return Response.json({ ok: true })
}
