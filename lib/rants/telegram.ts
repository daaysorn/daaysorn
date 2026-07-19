type TelegramButton = { text: string; callbackData: string }

export async function sendRantsTelegramMessage(
  text: string,
  options?: { inlineKeyboard?: TelegramButton[][] }
) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim()
  const chatId = process.env.TELEGRAM_OWNER_ID?.trim()
  if (!token || !chatId) return

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
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
    cache: "no-store",
  })
}
