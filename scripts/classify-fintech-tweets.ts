import { classifyTweetBatch, fintechCencori } from "@/lib/fintech/classify"
import {
  countUnclassifiedTweets,
  fintechCorpusStats,
  listUnclassifiedTweets,
  migrateFintechSchema,
  updateTweetClassifications,
} from "@/lib/fintech/db"
import type { FintechTweet, TweetClassification } from "@/lib/fintech/types"

const BATCH_SIZE = 25

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

await migrateFintechSchema()

const pending = await countUnclassifiedTweets()
if (!pending) {
  console.log("There are no unclassified tweets.")
  process.exit(0)
}

const target = Math.min(pending, requestedLimit)
console.log(`Classifying ${target} of ${pending} unclassified tweets...`)

const cencori = fintechCencori()
let processed = 0
let relevantFound = 0
let rejectedByGateway = 0

function skippedClassification(tweetId: string) {
  return {
    id: tweetId,
    relevant: false,
    category: "other" as const,
    claim: "",
    confidence: "low" as const,
  }
}

function sleep(ms: number) {
  return new Promise((resolvePause) => setTimeout(resolvePause, ms))
}

function isRateLimit(error: unknown) {
  return error instanceof Error && /rate limit/i.test(error.message)
}

// Rate limits are retried with backoff; they must never mark a tweet as
// classified, since the model never saw it.
async function classifyBatchWithRetry(tweets: FintechTweet[]) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await classifyTweetBatch(cencori, tweets)
    } catch (error) {
      if (!isRateLimit(error) || attempt >= 6) throw error
      const backoff = Math.min(2 ** attempt * 5_000, 120_000)
      console.warn(
        `  AI gateway rate limited, retrying in ${Math.round(backoff / 1000)}s...`
      )
      await sleep(backoff)
    }
  }
}

// Bisect failing batches so a single tweet that trips the gateway's
// content filter cannot block the rest of the batch.
async function classifyWithSplit(
  tweets: FintechTweet[]
): Promise<TweetClassification[]> {
  try {
    const classifications = await classifyBatchWithRetry(tweets)
    const classifiedIds = new Set(classifications.map((item) => item.id))
    return [
      ...classifications,
      ...tweets
        .filter((tweet) => !classifiedIds.has(tweet.id))
        .map((tweet) => skippedClassification(tweet.id)),
    ]
  } catch (error) {
    if (isRateLimit(error)) throw error
    if (tweets.length === 1) {
      rejectedByGateway += 1
      const reason = error instanceof Error ? error.message : String(error)
      console.warn(`  Skipped ${tweets[0].url}: ${reason}`)
      return [skippedClassification(tweets[0].id)]
    }
    const midpoint = Math.ceil(tweets.length / 2)
    return [
      ...(await classifyWithSplit(tweets.slice(0, midpoint))),
      ...(await classifyWithSplit(tweets.slice(midpoint))),
    ]
  }
}

while (processed < target) {
  const batch = await listUnclassifiedTweets(
    Math.min(BATCH_SIZE, target - processed)
  )
  if (!batch.length) break

  let classifications: TweetClassification[]
  try {
    classifications = await classifyWithSplit(batch)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    console.error(`Stopping: ${reason}. Progress is saved; rerun to continue.`)
    process.exitCode = 1
    break
  }
  await updateTweetClassifications(classifications)
  processed += batch.length
  relevantFound += classifications.filter(
    (item) => item.relevant && item.category !== "other"
  ).length
  console.log(`  ${processed}/${target} classified`)
  await sleep(1_000)
}

if (rejectedByGateway) {
  console.warn(
    `${rejectedByGateway} tweet(s) were rejected by the AI gateway and marked not relevant.`
  )
}

const stats = await fintechCorpusStats()
console.log(
  `\nDone. ${relevantFound} relevant in this run. Corpus: ${stats.total} tweets, ${stats.relevant} relevant, ${stats.unclassified} unclassified.`
)
if (!stats.unclassified) {
  console.log("Next: bun run fintech:docs, then bun run fintech:skill")
}
