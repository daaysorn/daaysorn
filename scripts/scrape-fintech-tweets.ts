import { migrateFintechSchema, saveFintechTweets } from "@/lib/fintech/db"
import { fetchUserTweets } from "@/lib/fintech/twitterapi"

const defaultHandles = ["smartnakamoura", "Akintola_steve"]

const handlesArgument = process.argv.find((argument) =>
  argument.startsWith("--handles=")
)
const includeReplies = process.argv.includes("--replies")
const handles = handlesArgument
  ? handlesArgument
      .split("=")[1]
      .split(",")
      .map((handle) => handle.trim().replace(/^@/, ""))
      .filter(Boolean)
  : defaultHandles

if (!handles.length) {
  throw new Error("--handles must list at least one X username")
}

await migrateFintechSchema()

console.log(`Scraping ${handles.length} account(s): ${handles.join(", ")}`)

const failures: Array<{ handle: string; reason: string }> = []

for (const handle of handles) {
  try {
    let inserted = 0
    let updated = 0
    const { tweets, skippedRetweets } = await fetchUserTweets(handle, {
      includeReplies,
      onPage: async (page, pageTweets) => {
        const saved = await saveFintechTweets(pageTweets)
        inserted += saved.inserted
        updated += saved.updated
        console.log(
          `  @${handle} page ${page}: ${pageTweets.length} tweets saved`
        )
      },
    })
    console.log(
      `@${handle}: ${tweets.length} tweets (${inserted} new, ${updated} refreshed, ${skippedRetweets} retweets skipped)`
    )
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    failures.push({ handle, reason })
    console.error(`Failed: @${handle}\n  ${reason}`)
  }
}

if (failures.length) {
  console.table(failures)
  process.exitCode = 1
} else {
  console.log("\nDone. Next: bun run fintech:classify")
}
