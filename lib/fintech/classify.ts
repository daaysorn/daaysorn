import { Cencori } from "cencori"

import type { FintechTweet, TweetClassification } from "@/lib/fintech/types"
import { fintechCategories, fintechCategoryDetails } from "@/lib/fintech/types"

const categoryGuide = fintechCategories
  .map((category) => `${category}: ${fintechCategoryDetails[category].focus}`)
  .join("\n")

const classifierSystemPrompt = `You curate a best-practice knowledge base for AI agents that build fintech applications. For each tweet, decide whether it contains actionable guidance, a hard-won lesson, or a factual insight relevant to building fintech products. Mark relevant=false for personal chatter, jokes, hiring posts, event promotion, motivation, engagement bait, product announcements without a lesson, and opinions with no actionable content. When relevant, pick exactly one category and distill the tweet into a single imperative best-practice claim in plain English, faithful to what the tweet actually says. Never invent specifics the tweet does not state. Set confidence to high only when the tweet states the practice explicitly and unambiguously, medium when the practice is clearly implied, and low when it is a loose inference. Categories:\n${categoryGuide}\nUse category "other" with relevant=false when nothing fits.`

const classificationSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    classifications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          id: { type: "string" },
          relevant: { type: "boolean" },
          category: {
            type: "string",
            enum: [...fintechCategories, "other"],
          },
          claim: { type: "string", maxLength: 240 },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
        },
        required: ["id", "relevant", "category", "claim", "confidence"],
      },
    },
  },
  required: ["classifications"],
}

export function fintechCencori() {
  const apiKey = process.env.CENCORI_API_KEY?.trim()
  if (!apiKey) throw new Error("CENCORI_API_KEY is not configured")
  return new Cencori({ apiKey })
}

export async function classifyTweetBatch(
  cencori: Cencori,
  tweets: FintechTweet[]
): Promise<TweetClassification[]> {
  const response = await cencori.ai.generateObject<{
    classifications: TweetClassification[]
  }>({
    model: process.env.CENCORI_FINTECH_MODEL?.trim() || "gpt-4.1-mini",
    schemaName: "fintech_tweet_classifications",
    schemaDescription:
      "Relevance and category classification for a batch of tweets.",
    schema: classificationSchema,
    maxTokens: 4000,
    messages: [
      { role: "system", content: classifierSystemPrompt },
      {
        role: "user",
        content: JSON.stringify(
          tweets.map((tweet) => ({
            id: tweet.id,
            author: tweet.authorHandle,
            text: tweet.text,
          }))
        ),
      },
    ],
  })

  const known = new Set(tweets.map((tweet) => tweet.id))
  return response.object.classifications.filter((item) => known.has(item.id))
}
