import { after } from "next/server"

import { saveKeep } from "@/lib/keeps/db"
import { enrichKeep } from "@/lib/keeps/enrich"

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
}

type TelegramUpdate = {
  message?: TelegramMessage
  edited_message?: TelegramMessage
  channel_post?: TelegramMessage
}

function findLink(message: TelegramMessage) {
  const entities = [
    ...(message.entities ?? []),
    ...(message.caption_entities ?? []),
  ]
  const entityLink = entities.find((entity) => entity.type === "text_link")?.url
  if (entityLink) return entityLink

  return (message.text ?? message.caption ?? "").match(
    /https?:\/\/[^\s<>]+/i
  )?.[0]
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

  const href = findLink(message)
  if (!href) {
    after(() =>
      reply(message.chat.id, "Send me a post or page link to add it to Keeps.")
    )
    return Response.json({ ok: true })
  }

  const rawText = message.text ?? message.caption ?? href
  after(async () => {
    try {
      const keep = await enrichKeep({
        href,
        rawText,
        telegramMessageId: message.message_id,
      })
      await saveKeep(keep)
      await reply(message.chat.id, `Kept: ${keep.title}`)
    } catch (error) {
      console.error("Keeps enrichment failed", {
        message: error instanceof Error ? error.message : "Unknown error",
        telegramMessageId: message.message_id,
      })
      await reply(
        message.chat.id,
        "I could not add that link. Please try again."
      )
    }
  })

  return Response.json({ ok: true })
}
