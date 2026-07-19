import type { FintechTweet } from "@/lib/fintech/types"

const API_BASE = "https://api.twitterapi.io"

type ApiTweet = {
  id: string
  text: string
  createdAt?: string
  url?: string
  twitterUrl?: string
  likeCount?: number
  retweetCount?: number
  replyCount?: number
  viewCount?: number
  isReply?: boolean
  author?: { userName?: string; name?: string }
  retweeted_tweet?: unknown
}

type TimelinePage = {
  tweets?: ApiTweet[]
  data?: { tweets?: ApiTweet[] }
  has_next_page?: boolean
  next_cursor?: string
  status?: string
  message?: string
}

function sleep(ms: number) {
  return new Promise((resolvePause) => setTimeout(resolvePause, ms))
}

function toFintechTweet(tweet: ApiTweet, handle: string): FintechTweet {
  return {
    id: tweet.id,
    authorHandle: tweet.author?.userName ?? handle,
    authorName: tweet.author?.name ?? handle,
    text: tweet.text,
    url:
      tweet.url ??
      tweet.twitterUrl ??
      `https://x.com/${handle}/status/${tweet.id}`,
    createdAt: tweet.createdAt ?? "",
    likeCount: tweet.likeCount ?? 0,
    retweetCount: tweet.retweetCount ?? 0,
    replyCount: tweet.replyCount ?? 0,
    viewCount: tweet.viewCount ?? 0,
    isReply: tweet.isReply ?? false,
  }
}

const MAX_ATTEMPTS = 6

async function fetchTimelinePage(endpoint: URL, apiKey: string) {
  for (let attempt = 1; ; attempt++) {
    const response = await fetch(endpoint, {
      headers: { "X-API-Key": apiKey },
      signal: AbortSignal.timeout(30_000),
    })
    if (response.ok) return response

    const retryable = response.status === 429 || response.status >= 500
    if (!retryable || attempt >= MAX_ATTEMPTS) {
      throw new Error(`twitterapi.io returned ${response.status}`)
    }

    const retryAfter = Number(response.headers.get("retry-after"))
    const backoff =
      retryAfter > 0
        ? Math.min(retryAfter * 1000, 60_000)
        : Math.min(2 ** attempt * 1000, 30_000)
    console.warn(
      `  Rate limited (${response.status}), retrying in ${Math.round(backoff / 1000)}s...`
    )
    await sleep(backoff)
  }
}

export async function fetchUserTweets(
  handle: string,
  {
    includeReplies = false,
    maxPages = 200,
    pageDelayMs = 1200,
    onPage,
  }: {
    includeReplies?: boolean
    maxPages?: number
    pageDelayMs?: number
    onPage?: (page: number, pageTweets: FintechTweet[]) => Promise<void> | void
  } = {}
) {
  const apiKey = process.env.TWITTERAPI_IO_KEY?.trim()
  if (!apiKey) throw new Error("TWITTERAPI_IO_KEY is not configured")

  const tweets: FintechTweet[] = []
  let skippedRetweets = 0
  let cursor = ""

  for (let page = 1; page <= maxPages; page++) {
    const endpoint = new URL(`${API_BASE}/twitter/user/last_tweets`)
    endpoint.searchParams.set("userName", handle)
    if (includeReplies) endpoint.searchParams.set("includeReplies", "true")
    if (cursor) endpoint.searchParams.set("cursor", cursor)

    const response = await fetchTimelinePage(endpoint, apiKey)
    const payload = (await response.json()) as TimelinePage
    if (payload.status === "error") {
      throw new Error(
        `twitterapi.io error for @${handle}: ${payload.message ?? "unknown"}`
      )
    }

    const rawTweets = payload.tweets ?? payload.data?.tweets ?? []
    const pageTweets: FintechTweet[] = []
    for (const tweet of rawTweets) {
      if (tweet.retweeted_tweet) {
        skippedRetweets += 1
        continue
      }
      if (!tweet.id || !tweet.text?.trim()) continue
      pageTweets.push(toFintechTweet(tweet, handle))
    }
    tweets.push(...pageTweets)

    await onPage?.(page, pageTweets)
    if (!payload.has_next_page || !payload.next_cursor?.trim()) break
    cursor = payload.next_cursor
    await sleep(pageDelayMs)
  }

  return { tweets, skippedRetweets }
}
