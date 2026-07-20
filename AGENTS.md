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
- Page Open Graph descriptions/subtitles must stay on one line (short; no multi-line marketing copy under the title).
- Prefer the content label and routes as `rants`, not `articles`.

## Learned Workspace Facts

- Fonts are wired via `next/font` CSS variables: `--font-heading` (Montserrat), `--font-sans` (Geist), `--font-mono` (JetBrains Mono).
- Documentation is intended to live at the `/docs` route, with a framed sidebar layout (Fumadocs; Cencori-style border/frame treatment).
- Design system: follow the canonical `daaysorn-design-system` skill at `public/doc/daaysorn-design-system/SKILL.md` (optional mirror under `.cursor/skills/`). Deep reference: `public/doc/designSystem.md`; runtime tokens: `app/globals.css` (originated from shadcn/ui Create).
- Custom Tailwind breakpoints: `watch` (300px / 18.75rem) and `xs` (360px / 22.5rem) plus default `sm`–`2xl`; phone layouts (including iPhone 12 at ~390px) use base + `xs:`, never `sm:` for phone targeting.
- Static/content page OG images use the shared PageLightSwiss template via `createPageOgImage` (`lib/og-page.ts`); new routes should add `opengraph-image.tsx` and resolve preview URLs with `lib/og-path` / `localOpenGraphImageSrc` (do not hard-code per-route OG preview paths).
- On mobile, the primary nav is a MagicUI dock stuck to the bottom; keep that placement unless explicitly changed.
