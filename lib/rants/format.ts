import type { TelegramTextEntity } from "@/lib/rants/types"

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function safeHref(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null
  } catch {
    return null
  }
}

function entityTags(entity: TelegramTextEntity, text: string) {
  switch (entity.type) {
    case "bold":
      return ["<strong>", "</strong>"]
    case "italic":
      return ["<em>", "</em>"]
    case "underline":
      return ["<u>", "</u>"]
    case "strikethrough":
      return ["<s>", "</s>"]
    case "code":
      return ["<code>", "</code>"]
    case "pre":
      return ["<pre><code>", "</code></pre>"]
    case "blockquote":
    case "expandable_blockquote":
      return ["<blockquote>", "</blockquote>"]
    case "text_link": {
      const href = entity.url ? safeHref(entity.url) : null
      return href
        ? [
            `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`,
            "</a>",
          ]
        : null
    }
    case "url": {
      const href = safeHref(
        text.slice(entity.offset, entity.offset + entity.length)
      )
      return href
        ? [
            `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">`,
            "</a>",
          ]
        : null
    }
    default:
      return null
  }
}

export function telegramTextToHtml(
  text: string,
  entities: TelegramTextEntity[] = []
) {
  const openings = new Map<number, string[]>()
  const closings = new Map<number, string[]>()

  for (const entity of entities) {
    if (
      !Number.isInteger(entity.offset) ||
      !Number.isInteger(entity.length) ||
      entity.offset < 0 ||
      entity.length <= 0 ||
      entity.offset + entity.length > text.length
    )
      continue

    const tags = entityTags(entity, text)
    if (!tags) continue
    const [open, close] = tags
    openings.set(entity.offset, [...(openings.get(entity.offset) ?? []), open])
    closings.set(entity.offset + entity.length, [
      close,
      ...(closings.get(entity.offset + entity.length) ?? []),
    ])
  }

  let html = ""
  for (let index = 0; index <= text.length; index += 1) {
    html += (closings.get(index) ?? []).join("")
    html += (openings.get(index) ?? []).join("")
    if (index === text.length) break
    const character = text[index]
    html += character === "\n" ? "<br />" : escapeHtml(character)
  }

  return html
}

export function stripRantCommand(
  text: string,
  entities: TelegramTextEntity[] = []
) {
  const match = text.match(/^\/rant(?:@\w+)?(?:\s+|$)/i)
  const offset = match?.[0].length ?? 0
  const bodyText = text.slice(offset).trim()
  const trimStart =
    text.slice(offset).length - text.slice(offset).trimStart().length
  const bodyOffset = offset + trimStart
  const bodyEntities = entities.flatMap((entity) => {
    const start = Math.max(entity.offset, bodyOffset)
    const end = Math.min(
      entity.offset + entity.length,
      bodyOffset + bodyText.length
    )
    if (end <= start) return []
    return [
      {
        ...entity,
        offset: start - bodyOffset,
        length: end - start,
      },
    ]
  })

  return {
    bodyText,
    bodyHtml: telegramTextToHtml(bodyText, bodyEntities),
  }
}
