import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import { PageBackLink } from "@/components/nav/page-back-link"
import { fintechCategories, fintechCategoryDetails } from "@/lib/fintech/types"

const skillDirectory = join(
  process.cwd(),
  "public",
  "skill",
  "fintech-best-practices"
)

const installCommand =
  "curl -fsSL https://daaysorn.com/skill/fintech-best-practices/install.sh | bash"

async function getSkillState() {
  try {
    const [entries, skillMarkdown] = await Promise.all([
      readdir(join(skillDirectory, "references")),
      readFile(join(skillDirectory, "SKILL.md"), "utf8"),
    ])
    const available = new Set(
      entries
        .filter((entry) => entry.endsWith(".md"))
        .map((entry) => entry.replace(/\.md$/, ""))
    )
    const generatedNote =
      skillMarkdown.match(/Generated on [^\n]+\./)?.[0] ?? null
    return { available, generatedNote }
  } catch {
    return { available: new Set<string>(), generatedNote: null }
  }
}

export default async function FintechSkillView() {
  const { available, generatedNote } = await getSkillState()

  return (
    <article className="min-w-0 pb-8 md:pb-24">
      <PageBackLink className="mb-7" />
      <h1 className="text-3xl leading-none font-bold tracking-tight xs:text-4xl md:text-3xl">
        Fintech Best Practices
      </h1>
      <p className="mt-3 text-sm text-muted-foreground xs:text-base md:mt-2">
        A skill for AI agents building fintech applications — security, data
        protection, fraud prevention, compliance, payments, reliability, and
        user trust. Synthesized from authoritative sources and practitioner
        insights, with every recommendation cited.
      </p>
      {generatedNote ? (
        <p className="mt-4 font-mono text-xs text-muted-foreground">
          {generatedNote}
        </p>
      ) : null}

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">Install</h2>
        <p className="mt-2 text-sm text-muted-foreground xs:text-base">
          Run this inside your project to install the skill for Claude Code.
          Agents load it automatically when working on fintech features.
        </p>
        <pre className="mt-4 min-w-0 rounded-lg border border-border bg-card p-4 text-xs break-all whitespace-pre-wrap text-card-foreground xs:text-sm">
          <code>{installCommand}</code>
        </pre>
        <p className="mt-3 text-sm text-muted-foreground">
          Using Cursor instead? Set{" "}
          <code className="break-all">
            FINTECH_SKILL_TARGET_DIR=.cursor/skills/fintech-best-practices
          </code>{" "}
          before running. You can also read the raw skill at{" "}
          <a
            href="/skill/fintech-best-practices/SKILL.md"
            className="font-semibold text-primary"
          >
            SKILL.md
          </a>
          .
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          Reference chapters
        </h2>
        <ul className="mt-4 flex flex-col gap-3">
          {fintechCategories.map((category) => {
            const details = fintechCategoryDetails[category]
            const isAvailable = available.has(category)
            return (
              <li
                key={category}
                className="min-w-0 rounded-lg border border-border bg-card p-4"
              >
                <div className="flex flex-col gap-1 xs:flex-row xs:items-baseline xs:justify-between xs:gap-3">
                  {isAvailable ? (
                    <a
                      href={`/skill/fintech-best-practices/references/${category}.md`}
                      className="font-semibold text-card-foreground"
                    >
                      {details.title}
                    </a>
                  ) : (
                    <span className="font-semibold text-muted-foreground">
                      {details.title}
                    </span>
                  )}
                  <span className="font-mono text-xs text-muted-foreground">
                    {isAvailable ? `references/${category}.md` : "coming soon"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {details.focus}
                </p>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold tracking-tight">
          How it is built
        </h2>
        <p className="mt-2 text-sm text-muted-foreground xs:text-base">
          Practitioner tweets are scraped and classified into categories, then
          combined with authoritative documents (OWASP, PCI DSS, GDPR, FATF).
          Each chapter passes an independent AI review before publishing, and
          authoritative sources always outrank practitioner opinion. Treat the
          practitioner insights as field-tested heuristics, not regulation.
        </p>
      </section>
    </article>
  )
}
