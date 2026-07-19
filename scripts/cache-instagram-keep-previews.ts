import {
  listInstagramPreviewsForStorage,
  updateKeepImageUrl,
} from "@/lib/keeps/db"
import { cacheInstagramPreview } from "@/lib/keeps/preview-storage"

const publish = process.argv.includes("--publish")
const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "")
if (!publicBaseUrl) throw new Error("R2_PUBLIC_BASE_URL is not configured")

const rows = await listInstagramPreviewsForStorage()
const pending = rows.filter(
  (row) => !row.image_url.startsWith(`${publicBaseUrl}/keeps/instagram/`)
)

if (!pending.length) {
  console.log("All Instagram Keep previews are already stored in R2.")
  process.exit(0)
}

console.log(`${pending.length} Instagram Keep previews need R2 storage.`)
if (!publish) {
  console.log(
    "Dry run only. Add --publish to download, compress, and store them."
  )
  process.exit(0)
}

let updated = 0
for (const row of pending) {
  const cachedUrl = await cacheInstagramPreview(row.image_url)
  if (!cachedUrl || cachedUrl === row.image_url) {
    console.error(`Failed: ${row.href}`)
    continue
  }
  await updateKeepImageUrl(row.id, cachedUrl)
  updated += 1
  console.log(`Stored ${updated}/${pending.length}: ${row.href}`)
}

console.log(`Updated ${updated}/${pending.length} Instagram Keep previews.`)
if (updated !== pending.length) process.exitCode = 1
