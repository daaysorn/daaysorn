import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { fintechCencori } from "@/lib/fintech/classify"
import { fintechCorpusStats, migrateFintechSchema } from "@/lib/fintech/db"
import type { CategoryEvidence } from "@/lib/fintech/synthesize"
import {
  buildCategoryEvidence,
  generateReviewedChapter,
} from "@/lib/fintech/synthesize"
import type { FintechCategory } from "@/lib/fintech/types"
import { fintechCategories, fintechCategoryDetails } from "@/lib/fintech/types"

const skillDirectory = join(
  process.cwd(),
  "public",
  "skill",
  "fintech-best-practices"
)
const referencesDirectory = join(skillDirectory, "references")

const onlyArgument = process.argv.find((argument) =>
  argument.startsWith("--category=")
)
const only = onlyArgument?.split("=")[1] as FintechCategory | undefined

if (only && !fintechCategories.includes(only)) {
  throw new Error(`--category must be one of: ${fintechCategories.join(", ")}`)
}

function sourcesAppendix(evidence: CategoryEvidence) {
  const lines = ["", "## Sources", ""]
  if (evidence.docs.length) {
    lines.push("Authoritative documents:", "")
    for (const doc of evidence.docs) {
      lines.push(`- [${doc.title}](${doc.url})`)
    }
    lines.push("")
  }
  if (evidence.claims.length) {
    lines.push("Practitioner insights:", "")
    for (const claim of evidence.claims) {
      lines.push(`- [${claim.author}](${claim.url}) — ${claim.claim}`)
    }
    lines.push("")
  }
  return lines.join("\n")
}

await migrateFintechSchema()

const cencori = fintechCencori()
const categories = only ? [only] : fintechCategories
const written: string[] = []
const skipped: string[] = []
const flagged: string[] = []

await mkdir(referencesDirectory, { recursive: true })

for (const category of categories) {
  const details = fintechCategoryDetails[category]
  const evidence = await buildCategoryEvidence(category)

  if (!evidence.claims.length && !evidence.docs.length) {
    skipped.push(category)
    console.log(`Skipped ${category}: no evidence in the database yet.`)
    continue
  }

  console.log(
    `Generating ${category} (${evidence.claims.length} claims, ${evidence.docs.length} docs)...`
  )
  let chapter
  try {
    chapter = await generateReviewedChapter(cencori, evidence)
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    flagged.push(category)
    console.error(`  Failed ${category}: ${reason}`)
    continue
  }
  if (!chapter.accepted) {
    flagged.push(category)
    console.warn(
      `  Review did not accept ${category} after one revision: ${chapter.review.feedback}`
    )
  }

  const body = [
    `# ${details.title}`,
    "",
    `> Part of the fintech-best-practices skill. Scope: ${details.focus}.`,
    chapter.accepted
      ? ""
      : "> ⚠️ This chapter did not pass automated review. Verify against the cited sources before relying on it.",
    "",
    chapter.document,
    sourcesAppendix(evidence),
  ]
    .filter((line, index) => line !== "" || index < 6)
    .join("\n")

  const filePath = join(referencesDirectory, `${category}.md`)
  await writeFile(filePath, `${body.trimEnd()}\n`)
  written.push(category)
  console.log(`  Wrote references/${category}.md`)
}

if (written.length) {
  const stats = await fintechCorpusStats()
  const generatedOn = new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Africa/Lagos",
  }).format(new Date())

  const index = fintechCategories
    .filter((category) => !skipped.includes(category) || only)
    .map(
      (category) =>
        `- [${fintechCategoryDetails[category].title}](references/${category}.md) — ${fintechCategoryDetails[category].focus}`
    )
    .join("\n")

  const skillMarkdown = `---
name: fintech-best-practices
description: Best practices for building fintech applications — security, data protection, fraud prevention, KYC/AML compliance, payments infrastructure, reliability, and user trust. Use when building, reviewing, or advising on any application that moves money, stores financial data, onboards customers for financial services, or integrates payment providers.
---

# Fintech Best Practices

A distilled knowledge base for AI agents building fintech applications, synthesized from authoritative sources (OWASP, PCI DSS, regulatory guidance) and practitioner insights from fintech builders on X. Every recommendation links back to its source.

Generated on ${generatedOn} from ${stats.relevant} practitioner insights (of ${stats.total} tweets analyzed) plus curated authoritative documents.

## How to use this skill

Read the reference chapter that matches the work at hand before writing code or giving advice. When chapters disagree with newer official guidance, the official guidance wins. Treat practitioner insights as field-tested heuristics, not regulation.

## Reference chapters

${index}

## Non-negotiables

Whatever you build, always: never store raw card numbers, CVVs, or plaintext credentials; make every money-moving operation idempotent; keep an immutable audit trail of financial state changes; encrypt financial data in transit and at rest; and verify webhook signatures before trusting payment events.
`

  await writeFile(join(skillDirectory, "SKILL.md"), skillMarkdown)
  console.log("\nWrote SKILL.md")
}

console.log(
  `\nDone. ${written.length} chapter(s) written${
    skipped.length ? `, skipped: ${skipped.join(", ")}` : ""
  }${flagged.length ? `, needs manual review: ${flagged.join(", ")}` : ""}.`
)
if (flagged.length) process.exitCode = 1
