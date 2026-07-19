import { neon } from "@neondatabase/serverless"

import type {
  ClassifiedTweet,
  FintechCategory,
  FintechDoc,
  FintechTweet,
  TweetClassification,
} from "@/lib/fintech/types"

let schemaReady: Promise<void> | undefined

function database() {
  const databaseUrl = process.env.DATABASE_URL?.trim()
  if (!databaseUrl) return null

  return neon(databaseUrl)
}

export async function migrateFintechSchema() {
  const sql = database()
  if (!sql) return

  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS fintech_tweets (
        id TEXT PRIMARY KEY,
        author_handle TEXT NOT NULL,
        author_name TEXT NOT NULL,
        text TEXT NOT NULL,
        url TEXT NOT NULL,
        created_at TIMESTAMPTZ,
        like_count INTEGER NOT NULL DEFAULT 0,
        retweet_count INTEGER NOT NULL DEFAULT 0,
        reply_count INTEGER NOT NULL DEFAULT 0,
        view_count BIGINT NOT NULL DEFAULT 0,
        is_reply BOOLEAN NOT NULL DEFAULT FALSE,
        relevant BOOLEAN,
        category TEXT,
        claim TEXT,
        confidence TEXT,
        classified_at TIMESTAMPTZ,
        scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
    await sql`
      CREATE INDEX IF NOT EXISTS fintech_tweets_category_idx
      ON fintech_tweets (category)
      WHERE relevant = TRUE
    `
    await sql`
      CREATE INDEX IF NOT EXISTS fintech_tweets_unclassified_idx
      ON fintech_tweets (scraped_at)
      WHERE relevant IS NULL
    `
    await sql`
      CREATE TABLE IF NOT EXISTS fintech_docs (
        url TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        source TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        relevance_score REAL NOT NULL DEFAULT 0,
        fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `
  })()

  await schemaReady
}

export async function saveFintechTweets(tweets: FintechTweet[]) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  let inserted = 0
  for (const tweet of tweets) {
    const result = await sql`
      INSERT INTO fintech_tweets (
        id, author_handle, author_name, text, url, created_at,
        like_count, retweet_count, reply_count, view_count, is_reply
      ) VALUES (
        ${tweet.id}, ${tweet.authorHandle}, ${tweet.authorName}, ${tweet.text},
        ${tweet.url}, ${tweet.createdAt || null}, ${tweet.likeCount},
        ${tweet.retweetCount}, ${tweet.replyCount}, ${tweet.viewCount},
        ${tweet.isReply}
      )
      ON CONFLICT (id) DO UPDATE SET
        like_count = EXCLUDED.like_count,
        retweet_count = EXCLUDED.retweet_count,
        reply_count = EXCLUDED.reply_count,
        view_count = EXCLUDED.view_count
      RETURNING (xmax = 0) AS inserted
    `
    if ((result[0] as { inserted: boolean } | undefined)?.inserted) {
      inserted += 1
    }
  }

  return { inserted, updated: tweets.length - inserted }
}

type TweetRow = {
  id: string
  author_handle: string
  author_name: string
  text: string
  url: string
  created_at: string | Date | null
  like_count: number
  retweet_count: number
  reply_count: number
  view_count: string | number
  is_reply: boolean
}

function toTweet(row: TweetRow): FintechTweet {
  return {
    id: row.id,
    authorHandle: row.author_handle,
    authorName: row.author_name,
    text: row.text,
    url: row.url,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    likeCount: row.like_count,
    retweetCount: row.retweet_count,
    replyCount: row.reply_count,
    viewCount: Number(row.view_count),
    isReply: row.is_reply,
  }
}

export async function listUnclassifiedTweets(limit: number) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT id, author_handle, author_name, text, url, created_at,
      like_count, retweet_count, reply_count, view_count, is_reply
    FROM fintech_tweets
    WHERE relevant IS NULL
    ORDER BY scraped_at ASC
    LIMIT ${limit}
  `) as TweetRow[]

  return rows.map(toTweet)
}

export async function countUnclassifiedTweets() {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT COUNT(*)::int AS count FROM fintech_tweets WHERE relevant IS NULL
  `) as Array<{ count: number }>

  return rows[0]?.count ?? 0
}

export async function updateTweetClassifications(
  classifications: TweetClassification[]
) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  for (const item of classifications) {
    await sql`
      UPDATE fintech_tweets
      SET relevant = ${item.relevant && item.category !== "other"},
        category = ${item.category === "other" ? null : item.category},
        claim = ${item.claim || null},
        confidence = ${item.confidence},
        classified_at = NOW()
      WHERE id = ${item.id}
    `
  }
}

export async function listClassifiedTweets(
  category: FintechCategory,
  limit = 120
): Promise<ClassifiedTweet[]> {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT id, author_handle, author_name, text, url, created_at,
      like_count, retweet_count, reply_count, view_count, is_reply,
      category, claim, confidence
    FROM fintech_tweets
    WHERE relevant = TRUE AND category = ${category} AND claim IS NOT NULL
    ORDER BY
      CASE confidence WHEN 'high' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
      like_count DESC
    LIMIT ${limit}
  `) as Array<
    TweetRow & {
      category: FintechCategory
      claim: string
      confidence: "high" | "medium" | "low"
    }
  >

  return rows.map((row) => ({
    ...toTweet(row),
    category: row.category,
    claim: row.claim,
    confidence: row.confidence,
  }))
}

export async function saveFintechDoc(doc: FintechDoc) {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  await sql`
    INSERT INTO fintech_docs (url, title, source, content, category, relevance_score)
    VALUES (
      ${doc.url}, ${doc.title}, ${doc.source}, ${doc.content},
      ${doc.category}, ${doc.relevanceScore}
    )
    ON CONFLICT (url) DO UPDATE SET
      title = EXCLUDED.title,
      content = EXCLUDED.content,
      relevance_score = GREATEST(fintech_docs.relevance_score, EXCLUDED.relevance_score),
      fetched_at = NOW()
  `
}

export async function listFintechDocs(
  category: FintechCategory,
  limit = 6
): Promise<FintechDoc[]> {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT url, title, source, content, category, relevance_score
    FROM fintech_docs
    WHERE category = ${category}
    ORDER BY relevance_score DESC
    LIMIT ${limit}
  `) as Array<{
    url: string
    title: string
    source: string
    content: string
    category: FintechCategory
    relevance_score: number
  }>

  return rows.map((row) => ({
    url: row.url,
    title: row.title,
    source: row.source,
    content: row.content,
    category: row.category,
    relevanceScore: row.relevance_score,
  }))
}

export async function fintechCorpusStats() {
  const sql = database()
  if (!sql) throw new Error("DATABASE_URL is not configured")

  const rows = (await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE relevant IS NULL)::int AS unclassified,
      COUNT(*) FILTER (WHERE relevant = TRUE)::int AS relevant
    FROM fintech_tweets
  `) as Array<{ total: number; unclassified: number; relevant: number }>

  return rows[0] ?? { total: 0, unclassified: 0, relevant: 0 }
}
