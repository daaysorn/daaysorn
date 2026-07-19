import { listKeepsForReformat, updateKeepEditorial } from "@/lib/keeps/db"
import { enrichKeep } from "@/lib/keeps/enrich"

const publish = process.argv.includes("--publish")
const includeFormatted = process.argv.includes("--all")
const continueOnError = process.argv.includes("--continue-on-error")
const limitArgument = process.argv.find((argument) =>
  argument.startsWith("--limit=")
)
const requestedLimit = Number(limitArgument?.split("=")[1] ?? Infinity)

if (
  requestedLimit !== Infinity &&
  (!Number.isInteger(requestedLimit) || requestedLimit < 1)
) {
  throw new Error("--limit must be a positive integer")
}

const keeps = (await listKeepsForReformat(includeFormatted)).slice(
  0,
  requestedLimit
)
if (!keeps.length) {
  console.log("There are no Keeps to reformat.")
  process.exit(0)
}

console.log(
  `${publish ? "Reformatting" : "Previewing"} ${keeps.length} Keeps with AI...`
)

let completed = 0
const failures: Array<{ href: string; reason: string }> = []

for (const keep of keeps) {
  try {
    const reformatted = await enrichKeep({
      href: keep.href,
      rawText: keep.rawText || keep.href,
      telegramMessageId: keep.telegramMessageId,
      customTags: keep.tags,
    })

    console.log(
      `\n${keep.href}\n  ${reformatted.title}\n  ${reformatted.summary}`
    )
    if (publish) await updateKeepEditorial(keep.id, reformatted)
    completed += 1
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    failures.push({ href: keep.href, reason })
    console.error(`Failed: ${keep.href}\n  ${reason}`)
    if (!continueOnError) break
  }
}

console.log(
  `\n${publish ? "Updated" : "Previewed"} ${completed}/${keeps.length} Keeps.`
)
if (!publish) {
  console.log(
    "No database rows were changed. Add --publish to save the output."
  )
}
if (failures.length) {
  console.table(failures)
  process.exitCode = 1
}
