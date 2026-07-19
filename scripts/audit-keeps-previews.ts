import { listKeeps, updateKeepImageUrl } from "@/lib/keeps/db"
import { captureKeepScreenshotPreview } from "@/lib/keeps/preview-storage"

const includeExisting = process.argv.includes("--all")
const publish = process.argv.includes("--publish")
const keeps = (await listKeeps()).filter(
  (keep) => includeExisting || !keep.imageUrl
)

if (!keeps.length) {
  console.log("There are no Keeps to audit.")
  process.exit(0)
}

console.log(
  `${publish ? "Auditing and updating" : "Auditing"} ${keeps.length} Keeps previews...`
)

let succeeded = 0
let failed = 0
let updated = 0

for (const [index, keep] of keeps.entries()) {
  const preview = await captureKeepScreenshotPreview(keep.href)
  const status = preview ? "ok" : "unavailable"
  console.log(`[${index + 1}/${keeps.length}] ${status} ${keep.href}`)

  if (!preview) {
    failed += 1
    continue
  }

  succeeded += 1
  if (publish && !keep.imageUrl) {
    await updateKeepImageUrl(keep.id, preview)
    updated += 1
  }
}

console.log(
  JSON.stringify(
    { tested: keeps.length, succeeded, failed, updated, publish },
    null,
    2
  )
)
