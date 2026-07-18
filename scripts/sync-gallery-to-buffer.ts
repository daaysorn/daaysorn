import { publishGalleryMediaToInstagram } from "@/lib/gallery/buffer"
import {
  listGalleryMediaPendingBuffer,
  markGalleryMediaPublishedToBuffer,
} from "@/lib/gallery/db"

const publish = process.argv.includes("--publish")
const continueOnError = process.argv.includes("--continue-on-error")
const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit=")
)
const limit = Number(limitArgument?.split("=")[1] ?? 20)

if (!Number.isFinite(limit) || limit < 1 || limit > 50) {
  throw new Error("--limit must be a number between 1 and 50")
}

if (!process.env.BUFFER_API_KEY?.trim()) {
  throw new Error("BUFFER_API_KEY is missing")
}
if (!process.env.BUFFER_INSTAGRAM_CHANNEL_ID?.trim()) {
  throw new Error("BUFFER_INSTAGRAM_CHANNEL_ID is missing")
}

const pending = await listGalleryMediaPendingBuffer(limit)
if (!pending.length) {
  console.log("All Gallery media is already synced to Buffer.")
  process.exit(0)
}

console.table(
  pending.map((item) => ({
    id: item.id,
    type: item.type,
    caption: item.caption || "(no caption)",
    createdAt: item.createdAt,
  }))
)

if (!publish) {
  console.log(
    `\nDry run only. Publish these ${pending.length} items with:\n` +
      `bun run buffer:sync-gallery --publish --limit=${limit}\n` +
      `Add --continue-on-error to skip failed items and keep going.`
  )
  process.exit(0)
}

let publishedCount = 0
let skippedCount = 0
const failures: Array<{ id: string; reason: string }> = []

for (const item of pending) {
  try {
    const result = await publishGalleryMediaToInstagram(item)
    if (result === "unconfigured") {
      throw new Error("Buffer is not configured")
    }
    await markGalleryMediaPublishedToBuffer(item.id, result.postId)
    publishedCount += 1
    console.log(`Published ${publishedCount}/${pending.length}: ${item.id}`)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    failures.push({ id: item.id, reason })
    console.error(`Failed on ${item.id}: ${reason}`)

    if (!continueOnError) {
      console.error(
        `Stopped after ${publishedCount} successful posts.` +
          (failures.length
            ? " Re-run with --continue-on-error to skip failures and finish the rest."
            : "")
      )
      process.exit(1)
    }

    skippedCount += 1
    console.warn(`Skipped ${item.id}; continuing (${skippedCount} skipped).`)
  }
}

console.log(
  `Synced ${publishedCount} Gallery items to Instagram through Buffer.` +
    (skippedCount ? ` Skipped ${skippedCount}.` : "")
)

if (failures.length) {
  console.table(failures)
  process.exit(skippedCount === pending.length ? 1 : 0)
}
