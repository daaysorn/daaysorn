<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Use Montserrat for headings, Geist for body/paragraph text, and JetBrains Mono for code.
- Prefer react-icons for UI icons (not Hugeicons).
- Prefer Prettier format-on-save in the editor.
- Prefer filled icons over outlined; color them with primary tokens (`text-primary` / `bg-primary`), not brand-native icon colors.
- Do not mention "Cursor" in design-system markdown under `public/doc/`.
- Long unbroken strings (tokens, URLs, env lines, hashes) must wrap — use `min-w-0` with `break-all` / `overflow-wrap-anywhere`.
- Always write the brand name as lowercase `daaysorn`, including at the beginning of sentences and in names such as `daaysorn account` and `daaysorn-cmp`.

## Fintech Best-Practices Skill Pipeline

Four-stage pipeline that builds the AI-agent skill at `public/skill/fintech-best-practices/` (served publicly at `/skill/fintech-best-practices/SKILL.md`). Code lives in `lib/fintech/` and `scripts/`. Run the stages in order:

1. `bun run fintech:scrape` — pulls practitioner timelines from twitterapi.io into the `fintech_tweets` table. Defaults to `@smartnakamoura` and `@Akintola_steve`; override with `--handles=a,b`, include replies with `--replies`. Retweets are skipped.
2. `bun run fintech:classify` — cencori classifies unclassified tweets in batches of 25 (relevance, category, distilled claim, confidence). Cap a run with `--limit=N`. Rerunnable; only processes rows where `relevant IS NULL`.
3. `bun run fintech:docs` — Valyu web search fills the `fintech_docs` table with authoritative sources (OWASP, PCI DSS, KYC/AML, payments engineering) per category. Filter with `--category=<name>`.
4. `bun run fintech:skill` — synthesizes `SKILL.md` + `references/<category>.md` with a generate → independent review → revise loop. Authoritative docs outrank tweet claims; every recommendation cites its source. Chapters failing review twice are still written but flagged with a warning banner and exit code 1. Rebuild one chapter with `--category=<name>`.

Categories are defined once in `lib/fintech/types.ts` (security, data-protection, fraud, compliance, payments, reliability, ux-trust) and shared by the classifier, Valyu queries, and skill output. Requires `TWITTERAPI_IO_KEY`, `VALYU_API_KEY`, `CENCORI_API_KEY`, and `DATABASE_URL`; tables are created by `bun run db:migrate` (`migrateFintechSchema`).

## Learned Workspace Facts

- Fonts are wired via `next/font` CSS variables: `--font-heading` (Montserrat), `--font-sans` (Geist), `--font-mono` (JetBrains Mono).
- Documentation is intended to live at the `/docs` route, with a framed sidebar layout (Fumadocs; Cencori-style border/frame treatment).
- Design system: follow the canonical `daaysorn-design-system` skill at `public/doc/daaysorn-design-system/SKILL.md` (optional mirror under `.cursor/skills/`). Deep reference: `public/doc/designSystem.md`; runtime tokens: `app/globals.css` (originated from shadcn/ui Create).
- Custom Tailwind breakpoints: `watch` (300px / 18.75rem) and `xs` (360px / 22.5rem) plus default `sm`–`2xl`; phone layouts (including iPhone 12 at ~390px) use base + `xs:`, never `sm:` for phone targeting.
