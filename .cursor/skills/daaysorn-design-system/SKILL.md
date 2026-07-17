---
name: daaysorn-design-system
description: Daaysorn's design system — tokens, fonts, breakpoints, radius, and components for building UI in this repo. Use when building or editing any UI, styling components, choosing colors/spacing/typography, adding responsive/breakpoint behavior, theming (light/dark), or porting the system to another site, or when the user says to use the daaysorn-design-system skill.
---

# Daaysorn Design System

Authoritative rules for building UI in this repo. The **deep reference** is `public/doc/designSystem.md`; the **runtime source of truth** is `app/globals.css`. Read the relevant doc section before non-trivial UI work (progressive disclosure map in the last section).

## Rules the agent must never violate

1. Use **semantic tokens only** — never hard-code hex/oklch/rgb or raw px colors in components. Use `bg-*`, `text-*`, `border-*` mapped from tokens.
2. Colors come from these roles: `background`, `foreground`, `card`, `popover`, `primary`, `secondary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `sidebar*`, `chart-1..5`. Nothing else.
3. Quiet/secondary text = `text-muted-foreground`. Brand emphasis = `text-primary` (often `font-semibold`).
4. Type is role-based: **Geist** body (`font-sans`, default), **Montserrat** headings (`<h1>`–`<h6>` auto via base layer), **JetBrains Mono** code (`font-mono`, `<code>`/`<kbd>`/`pre`). Don't introduce other fonts.
5. Radius uses the scale (`rounded-sm`…`rounded-4xl`) derived from `--radius`. Don't invent arbitrary radii.
6. Breakpoints are mobile-first: **base → `watch` (300px) → `xs` (360px) → `sm` 640 → `md` 768 → `lg` 1024 → `xl` 1280 → `2xl` 1536**. Phone layout is **base**; `sm:` is NOT "phone".
7. iPhone 12 (~390px) = **base + `xs:`**, never `sm:`. Put phone styling in base/`xs:`.
8. Use `max-watch:` for glanceable/ultra-narrow simplifications only; don't build primary UI inside `watch:` min-width.
9. Keep Tailwind defaults `sm`–`2xl` intact (shadcn/ecosystem compatibility). Only `watch`/`xs` are custom.
10. Merge classes with `cn()` from `@/lib/utils` — never manual string concatenation for conditional classes.
11. Reuse existing components (`components/ui/*`) and their APIs before creating new ones. New components use CVA variants consuming tokens.
12. Respect theming: dark is default; support light via semantic tokens, not per-color overrides. `d` key toggles theme.
13. Accessibility is non-negotiable: visible focus (`ring-ring`), `aria-label` on icon-only controls, ≥4.5:1 text contrast, external links get `rel="noopener noreferrer"`.

## Token → utility quick map

| Need | Utility |
|------|---------|
| Page canvas | `bg-background text-foreground` |
| Elevated surface | `bg-card text-card-foreground` / `bg-popover` |
| Primary action | `<Button>` (`bg-primary text-primary-foreground`) |
| Quiet text | `text-muted-foreground` |
| Brand emphasis | `text-primary font-semibold` |
| Borders / inputs | `border-border` / `border-input` |
| Focus ring | `ring-ring` (buttons already handle it) |
| Danger | `variant="destructive"` / `text-destructive` |

## Typography

- Body: default (`font-sans` = Geist). Headings: use real `<h*>` tags (Montserrat applied in base layer). Code: `<code>`/`<kbd>`/`pre` or `font-mono`.
- Common patterns: caption `text-sm text-muted-foreground`; mono hint `font-mono text-xs text-muted-foreground`.

## Breakpoints

```tsx
// phone base → modern-phone polish → tablet
<div className="flex flex-col gap-3 xs:gap-4 md:flex-row md:gap-6" />
<nav className="hidden md:flex" />          // desktop nav
<div className="max-md:px-4" />              // phone-only
<header className="max-watch:py-2" />        // ultra-narrow
```
Full rationale (why not Tailwind naming, device table): `public/doc/designSystem.md` §7.

## Radius

`--radius` (0.625rem) drives `sm`(6px) `md`(8px) `lg`(10px) `xl`(14px) `2xl`(18px) `3xl`(22px) `4xl`(26px). Button default `rounded-md`; Dock `rounded-2xl`; icons `rounded-full`.

## Components (existing APIs — reuse these)

```tsx
import { Button } from "@/components/ui/button"
<Button variant="default|outline|secondary|ghost|destructive|link" size="default|xs|sm|lg|icon|icon-xs|icon-sm|icon-lg" />
<Button asChild><Link href="/x">Go</Link></Button>

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Dock, DockIcon } from "@/components/ui/dock"
```
Details/variants: `public/doc/designSystem.md` §10.

## Build checklist

Before writing UI:
```
- [ ] Identified the semantic tokens (no raw colors)
- [ ] Correct font roles (headings via <h*>, code via <code>/font-mono)
- [ ] Mobile-first: base styles first, then xs:/md:/lg: as needed
- [ ] Reusing components/ui/* where possible
```
After writing UI:
```
- [ ] No hard-coded hex/oklch/px colors
- [ ] Classes merged with cn(); conditional classes clean
- [ ] Focus visible + aria-labels on icon-only controls
- [ ] Renders in light AND dark (semantic tokens only)
- [ ] Reads well at base width (iPhone 12 = base + xs:)
```

## Portability (use on any site)

Same system, swap **token values only** (keep token names + component APIs). To rebrand: change OKLCH values in `:root`/`.dark`, `--radius`, font families in `app/layout.tsx`, and `--breakpoint-*` rems if needed. Never rename semantic tokens or hard-code values in components. Full contract: `public/doc/designSystem.md` §15.

## Progressive disclosure — open the doc when

| Task | Read section |
|------|--------------|
| Colors / tokens | §3 |
| Fonts / type scale | §4 |
| Radius | §5 |
| Layout / shell | §6 |
| Responsive / breakpoints | §7 |
| Motion | §8 |
| Theming (light/dark) | §9 |
| Component variants/APIs | §10 |
| Accessibility | §12 |
| Recipes | §13 |
| Add token/font/component | §14 |
| Rebrand / multi-brand / reuse elsewhere | §15 |
