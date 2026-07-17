<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Learned User Preferences

- Use Montserrat for headings, Geist for body/paragraph text, and JetBrains Mono for code.
- Prefer react-icons for UI icons (not Hugeicons).
- Prefer Prettier format-on-save in the editor.

## Learned Workspace Facts

- Fonts are wired via `next/font` CSS variables: `--font-heading` (Montserrat), `--font-sans` (Geist), `--font-mono` (JetBrains Mono).
- Documentation is intended to live at the `/docs` route, with a framed sidebar layout (Fumadocs; Cencori-style border/frame treatment).
- Design system: **main** skill is `public/doc/daaysorn-design-system/SKILL.md` (https://github.com/daaysorn/daaysorn/blob/main/public/doc/daaysorn-design-system/SKILL.md); Cursor keeps a mirror at `.cursor/skills/daaysorn-design-system/SKILL.md` — edit main, then sync the copy. Deep reference: `public/doc/designSystem.md`; runtime tokens: `app/globals.css`.
