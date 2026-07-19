import { Cencori } from "cencori"

import { listClassifiedTweets, listFintechDocs } from "@/lib/fintech/db"
import type { FintechCategory } from "@/lib/fintech/types"
import { fintechCategoryDetails } from "@/lib/fintech/types"

const MAX_CLAIMS = 80
const MAX_DOC_EXCERPT = 4000

export type CategoryEvidence = {
  category: FintechCategory
  claims: Array<{
    claim: string
    quote: string
    author: string
    url: string
    confidence: string
    likes: number
  }>
  docs: Array<{ title: string; url: string; excerpt: string }>
}

export async function buildCategoryEvidence(
  category: FintechCategory
): Promise<CategoryEvidence> {
  const [tweets, docs] = await Promise.all([
    listClassifiedTweets(category, MAX_CLAIMS),
    listFintechDocs(category),
  ])

  return {
    category,
    claims: tweets.map((tweet) => ({
      claim: tweet.claim,
      quote: tweet.text.slice(0, 500),
      author: `@${tweet.authorHandle}`,
      url: tweet.url,
      confidence: tweet.confidence,
      likes: tweet.likeCount,
    })),
    docs: docs.map((doc) => ({
      title: doc.title,
      url: doc.url,
      excerpt: doc.content.slice(0, MAX_DOC_EXCERPT),
    })),
  }
}

const writerSystemPrompt = `You write one reference chapter of a "fintech best practices" skill that AI coding agents load before building fintech applications. Your readers are AI agents and engineers, so write precise, imperative, immediately actionable guidance. Ground every recommendation in the supplied evidence: authoritative document excerpts are the primary source of truth, practitioner tweet claims add real-world lessons. When a tweet claim conflicts with an authoritative source, follow the authoritative source and note the disagreement. Never invent regulations, standards, version numbers, thresholds, or API behaviors that the evidence does not state. Cite sources inline as markdown links. For document-derived advice use the document URL. For practitioner-claim advice use the claim's ref token as the link target exactly, for example [@handle](T3); the tokens are replaced with real links during post-processing. Structure the chapter with a short intro, clear H2/H3 sections, checklists of imperatives, and a closing "Common mistakes" section. Use plain markdown. Do not include YAML frontmatter, a top-level H1, or meta commentary about this prompt or the evidence format.`

const reviewerSystemPrompt = `You are the independent quality gate for a fintech best-practices reference used by AI coding agents. Compare the candidate chapter against the supplied evidence only. Reject the chapter if it contains: security, compliance, or financial advice not supported by the evidence; invented regulations, standards, numbers, or API behaviors; advice that is actively dangerous for a fintech system; citations pointing at sources that do not support the claim. Practitioner-claim citations use ref tokens like [@handle](T3) instead of URLs; that is the expected format, not a defect. Minor stylistic issues are not grounds for rejection. When rejecting, give concrete, evidence-bounded rewrite instructions. Accept chapters whose recommendations are all traceable to the evidence.`

type ChapterDraft = { document: string }
type ChapterReview = { accepted: boolean; feedback: string; issues: string[] }

// The AI gateway's screening rejects payloads containing many tweet URLs, so
// the model only ever sees ref tokens (T1, T2, ...); real links are restored
// after generation.
function claimsWithRefs(evidence: CategoryEvidence) {
  return evidence.claims.map((claim, index) => ({
    ref: `T${index + 1}`,
    claim: claim.claim,
    quote: claim.quote,
    author: claim.author,
    confidence: claim.confidence,
    likes: claim.likes,
  }))
}

function resolveClaimRefs(document: string, evidence: CategoryEvidence) {
  return document.replace(/\]\(T(\d+)\)/g, (match, index) => {
    const claim = evidence.claims[Number(index) - 1]
    return claim ? `](${claim.url})` : match
  })
}

async function generateChapter(
  cencori: Cencori,
  evidence: CategoryEvidence,
  revisionFeedback = ""
) {
  const details = fintechCategoryDetails[evidence.category]
  const response = await cencori.ai.generateObject<ChapterDraft>({
    model: process.env.CENCORI_FINTECH_MODEL?.trim() || "gpt-4.1-mini",
    schemaName: "fintech_skill_chapter",
    schemaDescription:
      "A markdown reference chapter for the fintech best-practices skill.",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        document: { type: "string", minLength: 400 },
      },
      required: ["document"],
    },
    maxTokens: 6000,
    messages: [
      { role: "system", content: writerSystemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          chapter: details.title,
          scope: details.focus,
          authoritativeDocs: evidence.docs,
          practitionerClaims: claimsWithRefs(evidence),
          revisionFeedback: revisionFeedback || undefined,
        }),
      },
    ],
  })

  return response.object.document.trim()
}

async function reviewChapter(
  cencori: Cencori,
  evidence: CategoryEvidence,
  candidate: string
) {
  const response = await cencori.ai.generateObject<ChapterReview>({
    model: process.env.CENCORI_FINTECH_REVIEW_MODEL?.trim() || "gpt-4.1-mini",
    schemaName: "fintech_skill_chapter_review",
    schemaDescription:
      "An evidence-based quality review of a fintech skill chapter.",
    schema: {
      type: "object",
      additionalProperties: false,
      properties: {
        accepted: { type: "boolean" },
        feedback: { type: "string", minLength: 1, maxLength: 600 },
        issues: {
          type: "array",
          maxItems: 8,
          items: { type: "string", maxLength: 200 },
        },
      },
      required: ["accepted", "feedback", "issues"],
    },
    maxTokens: 500,
    messages: [
      { role: "system", content: reviewerSystemPrompt },
      {
        role: "user",
        content: JSON.stringify({
          evidence: {
            authoritativeDocs: evidence.docs.map((doc) => ({
              title: doc.title,
              url: doc.url,
              excerpt: doc.excerpt.slice(0, 1500),
            })),
            practitionerClaims: claimsWithRefs(evidence),
          },
          candidate,
        }),
      },
    ],
  })

  return response.object
}

function isGatewayRejection(error: unknown) {
  return (
    error instanceof Error && /security violation/i.test(error.message)
  )
}

function withoutQuotes(evidence: CategoryEvidence): CategoryEvidence {
  return {
    ...evidence,
    claims: evidence.claims.map((claim) => ({ ...claim, quote: "" })),
  }
}

function withoutExcerpts(evidence: CategoryEvidence): CategoryEvidence {
  return {
    ...evidence,
    docs: evidence.docs.map((doc) => ({
      ...doc,
      excerpt: doc.excerpt.slice(0, 600),
    })),
  }
}

async function runChapterLoop(cencori: Cencori, evidence: CategoryEvidence) {
  let candidate = await generateChapter(cencori, evidence)
  let review = await reviewChapter(cencori, evidence, candidate)

  if (!review.accepted) {
    const feedback = [
      review.feedback,
      ...review.issues.map((issue) => `Issue: ${issue}`),
    ]
      .filter(Boolean)
      .join(" ")
    candidate = await generateChapter(cencori, evidence, feedback)
    review = await reviewChapter(cencori, evidence, candidate)
  }

  return { document: candidate, accepted: review.accepted, review }
}

// The AI gateway's content filter sometimes rejects security/fraud evidence
// (raw tweets, attack-technique excerpts) as malicious. Retry with
// progressively slimmer evidence before giving up.
export async function generateReviewedChapter(
  cencori: Cencori,
  evidence: CategoryEvidence
) {
  const attempts = [
    evidence,
    withoutQuotes(evidence),
    withoutExcerpts(withoutQuotes(evidence)),
  ]

  let lastError: unknown
  for (const [index, attempt] of attempts.entries()) {
    try {
      const result = await runChapterLoop(cencori, attempt)
      return {
        ...result,
        document: resolveClaimRefs(result.document, evidence),
      }
    } catch (error) {
      if (!isGatewayRejection(error)) throw error
      lastError = error
      if (index < attempts.length - 1) {
        console.warn(
          "  Gateway rejected the evidence payload, retrying with reduced evidence..."
        )
      }
    }
  }
  throw lastError
}
