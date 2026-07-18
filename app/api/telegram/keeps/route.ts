import { after } from "next/server"
import { revalidatePath, revalidateTag } from "next/cache"

import { deleteKeepByHref, saveKeep } from "@/lib/keeps/db"
import { enrichKeep } from "@/lib/keeps/enrich"
import { normalizeKeepUrl } from "@/lib/keeps/url"
import { publishPublicKeepsChanged } from "@/lib/keeps/realtime"

export const maxDuration = 60

type TelegramEntity = {
  type: string
  url?: string
}

type TelegramMessage = {
  message_id: number
  text?: string
  caption?: string
  entities?: TelegramEntity[]
  caption_entities?: TelegramEntity[]
  chat: { id: number }
  from?: { id: number }
  reply_to_message?: TelegramMessage
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
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

async function reply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  if (!token) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
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

function invalidatePublicKeeps() {
  revalidateTag("keeps", { expire: 0 })
  revalidatePath("/keeps")
}

export async function POST(request: Request) {
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
  const receivedSecret = request.headers.get("x-telegram-bot-api-secret-token")

  if (!expectedSecret || receivedSecret !== expectedSecret) {
    return new Response("Unauthorized", { status: 401 })
  }

  const update = (await request.json()) as TelegramUpdate
  const message = update.message ?? update.edited_message ?? update.channel_post
  if (!message) return Response.json({ ok: true })

  const ownerId = Number(process.env.TELEGRAM_OWNER_ID)
  const senderId = message.from?.id ?? message.chat.id
  if (!Number.isSafeInteger(ownerId) || senderId !== ownerId) {
    return new Response("Forbidden", { status: 403 })
  }

  const rawText = message.text ?? message.caption ?? ""
  const hrefs = findLinks(message)
  const isDeleteCommand = /^\/delete(?:@\w+)?\b/i.test(rawText)

  if (isDeleteCommand) {
    if (!hrefs.length) {
      after(() =>
        reply(
          message.chat.id,
          "Send /delete followed by the link, or reply /delete to the original link message."
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
          invalidatePublicKeeps()
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
      reply(message.chat.id, "Send me a post or page link to add it to Keeps.")
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
    const failed = results.filter((result) => result.status === "rejected")

    failed.forEach((result, index) => {
      console.error("Keeps enrichment failed", {
        message:
          result.status === "rejected" && result.reason instanceof Error
            ? result.reason.message
            : "Unknown error",
        telegramMessageId: message.message_id,
        linkIndex: index,
      })
    })

    if (!saved.length) {
      await reply(
        message.chat.id,
        `I could not add ${hrefs.length === 1 ? "that link" : "those links"}. Please try again.`
      )
      return
    }

    invalidatePublicKeeps()
    await notifyPublicKeepsChanged()

    const titles = saved.map((keep) => `• ${keep.title}`).join("\n")
    const failureNote = failed.length
      ? `\n${failed.length} ${failed.length === 1 ? "link was" : "links were"} not added.`
      : ""
    await reply(
      message.chat.id,
      `Kept ${saved.length} ${saved.length === 1 ? "link" : "links"}:\n${titles}${failureNote}`
    )
  })

  return Response.json({ ok: true })
}
