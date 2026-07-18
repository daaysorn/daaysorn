export {}

const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim()
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim()

if (!token || !secret || !siteUrl) {
  throw new Error(
    "TELEGRAM_BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, and NEXT_PUBLIC_SITE_URL are required"
  )
}

const webhookUrl = new URL("/api/telegram/keeps", siteUrl).toString()
const response = await fetch(
  `https://api.telegram.org/bot${token}/setWebhook`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: secret,
      allowed_updates: ["message", "edited_message", "channel_post"],
    }),
  }
)

const result = (await response.json()) as {
  ok: boolean
  description?: string
}

if (!response.ok || !result.ok) {
  throw new Error(result.description || "Telegram rejected the webhook")
}

console.log(`Telegram Keeps webhook set to ${webhookUrl}`)
