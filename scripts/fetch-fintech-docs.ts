import { migrateFintechSchema, saveFintechDoc } from "@/lib/fintech/db"
import type { FintechCategory } from "@/lib/fintech/types"
import { fintechCategories } from "@/lib/fintech/types"
import { valyuSearch } from "@/lib/fintech/valyu"

const categoryQueries: Record<FintechCategory, string[]> = {
  security: [
    "OWASP ASVS authentication and session management requirements for financial applications",
    "API security best practices for banking and fintech PSD2 open banking",
  ],
  "data-protection": [
    "PCI DSS requirements for storing and tokenizing cardholder data",
    "GDPR requirements for processing financial and payment data, data minimization and retention",
  ],
  fraud: [
    "payment fraud prevention best practices velocity checks device fingerprinting account takeover",
    "chargeback and dispute management best practices for online payments",
  ],
  compliance: [
    "KYC customer due diligence and AML transaction monitoring requirements FATF recommendations",
    "sanctions screening and audit trail requirements for fintech companies",
  ],
  payments: [
    "idempotency keys and double-entry ledger design for payment systems",
    "payment webhook reliability retries and reconciliation engineering best practices",
  ],
  reliability: [
    "site reliability engineering practices for financial systems and payment processing uptime",
  ],
  "ux-trust": [
    "UX design best practices for fintech apps building user trust transaction transparency",
  ],
}

const onlyArgument = process.argv.find((argument) =>
  argument.startsWith("--category=")
)
const only = onlyArgument?.split("=")[1] as FintechCategory | undefined

if (only && !fintechCategories.includes(only)) {
  throw new Error(`--category must be one of: ${fintechCategories.join(", ")}`)
}

await migrateFintechSchema()

const categories = only ? [only] : fintechCategories
let saved = 0
const failures: Array<{ query: string; reason: string }> = []

for (const category of categories) {
  console.log(`\n${category}:`)
  for (const query of categoryQueries[category]) {
    try {
      const results = await valyuSearch(query)
      for (const result of results) {
        await saveFintechDoc({
          url: result.url,
          title: result.title,
          source: result.source,
          content: result.content,
          category,
          relevanceScore: result.relevance_score ?? 0,
        })
        saved += 1
      }
      console.log(`  ${results.length} result(s): ${query}`)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      failures.push({ query, reason })
      console.error(`  Failed: ${query}\n    ${reason}`)
    }
  }
}

console.log(`\nSaved ${saved} authoritative documents.`)
if (failures.length) {
  console.table(failures)
  process.exitCode = 1
}
