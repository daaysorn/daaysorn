# daaysorn Design System

> **Source of truth:** this document reflects the live codebase. Tokens live in `app/globals.css`. Fonts and shell layout live in `app/layout.tsx`. Components live under `components/`.

| Meta          | Value                                                                                              |
| ------------- | -------------------------------------------------------------------------------------------------- |
| Product       | daaysorn                                                                                           |
| UI kit        | shadcn/ui (`radix-vega` style)                                                                     |
| Theme origin  | [shadcn/ui Create](https://ui.shadcn.com/create) → generated `app/globals.css` + `components.json` |
| Styling       | Tailwind CSS v4 + CSS variables (OKLCH)                                                            |
| Base palette  | Neutral (`components.json` → `baseColor: "neutral"`)                                               |
| Default theme | Dark (`ThemeProvider` `defaultTheme="dark"`)                                                       |
| Last audited  | From current `app/`, `components/`, `views/`                                                       |

---

## Table of contents

1. [Principles](#1-principles)
2. [Architecture & file map](#2-architecture--file-map)
3. [Color system](#3-color-system)
   - [3.6 Muted text & quiet chrome](#36-muted-text--quiet-chrome)
4. [Typography](#4-typography)
5. [Radius & shape](#5-radius--shape)
6. [Spacing, layout & shell](#6-spacing-layout--shell)
7. [Breakpoints — philosophy, approach & how it helps](#7-breakpoints--philosophy-approach--how-it-helps)
8. [Motion & interaction](#8-motion--interaction)
   - [8.7 Ghost, loaders & feedback motion](#87-ghost-loaders--feedback-motion)
   - [8.8 Performance, previews & perceived speed](#88-performance-previews--perceived-speed)
   - [8.9 Open Graph — page template (PageLightSwiss)](#89-open-graph--page-template-pagelightswiss)
9. [Theming](#9-theming)
10. [Components](#10-components)
11. [Icons](#11-icons)
12. [Accessibility](#12-accessibility)
13. [Usage recipes](#13-usage-recipes)
    - [13.6 Long strings must wrap](#136-long-strings-must-wrap-tokens-urls-env-lines-mono)
14. [Extending the system](#14-extending-the-system)
15. [Portability & multi-brand — use on any site](#15-portability--multi-brand--use-on-any-site)
16. [Agent usage (skill)](#16-agent-usage-skill)

---

## 1. Principles

| Principle                         | How it shows up in code                                                                                               |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Token-first**                   | Semantic CSS variables (`--primary`, `--muted-foreground`) mapped into Tailwind via `@theme inline`                   |
| **Mobile-first shell**            | Root content column is `max-w-md` — phone-narrow composition by default                                               |
| **Semantic color, not raw hex**   | Prefer `bg-primary` / `text-muted-foreground` over hard-coded colors                                                  |
| **Neutral chrome**                | Near-monochrome light/dark with a single warm-red destructive accent                                                  |
| **Role-based type**               | Body = Geist, headings = Montserrat, code = JetBrains Mono                                                            |
| **Composable UI**                 | shadcn + Radix primitives; Magic UI registry available (`@magicui`)                                                   |
| **Performance is visual quality** | Server-render static composition; hydrate only interaction; avoid hidden work that makes motion or feedback feel slow |

---

## Form focus (rule)

Inputs and textareas do not use focus rings. The system relies on layout, spacing, and subtle surface contrast (border/background) instead of `ring-*` shadows on focus. Avoid adding `focus-visible:ring-*` to inputs, textareas, or input-like surfaces.

---

## 2. Architecture & file map

```
app/
  globals.css          ← color tokens, radius scale, base type rules
  layout.tsx           ← fonts, ThemeProvider, page shell
  page.tsx             ← routes into views
components/
  theme-provider.tsx   ← next-themes + "d" hotkey
  nav/
    header.tsx         ← site header (stub)
    footer.tsx         ← copyright, now-playing, social dock
    index.ts
  ui/
    button.tsx         ← CVA button system
    tooltip.tsx        ← Radix tooltip
    dock.tsx           ← Magic UI–style magnifying dock
views/
  homeView.tsx         ← home composition
  galleryView.tsx      ← Gallery data loading + page composition
  rants/
    index.ts           ← feature exports consumed by views/index.ts
    rantsView.tsx      ← Rants Archive index composition
    rantArticleView.tsx ← published Rant + private preview composition
lib/
  utils.ts             ← cn() = clsx + tailwind-merge
components.json        ← shadcn config
```

### Route-to-view structure

App Router route files stay deliberately thin. A page file owns framework-level
concerns such as metadata, route params, revalidation, and Open Graph wiring,
then renders a composition imported from `views/`. The matching view owns page
data loading and the complete body layout. Reusable or client-interactive
sections live under `components/<feature>/` and are composed by the view.

```tsx
// app/gallery/page.tsx
import { GalleryView } from "@/views"

export default function GalleryPage() {
  return <GalleryView />
}
```

Use `<routeName>View.tsx` directly under `views/` while a feature has only one
view file. When it needs a second view, create `views/<feature>/`, move every
view for that feature into the folder, and expose them through the feature's
`index.ts`. The root `views/index.ts` imports only from that local barrel. Do
not place Gallery, Rants, or another page's full data-loading and body
implementation directly in `app/**/page.tsx`.

### Stack preview

| Layer         | Package / API                                     |
| ------------- | ------------------------------------------------- |
| Framework     | Next.js App Router                                |
| React         | 19                                                |
| CSS           | Tailwind v4 (`@import "tailwindcss"`)             |
| Animation CSS | `tw-animate-css`                                  |
| shadcn styles | `shadcn/tailwind.css`                             |
| Motion        | `motion` (Framer Motion successor) — used by Dock |
| Class merge   | `cn()` in `lib/utils.ts`                          |
| Variants      | `class-variance-authority` (CVA)                  |
| Themes        | `next-themes` (class strategy on `<html>`)        |

### 2.1 Origin: generated from shadcn Create

`app/globals.css` and the initial token set were generated via **[shadcn/ui Create](https://ui.shadcn.com/create)** (style `radix-vega`, base color `neutral`, CSS variables on). That means:

| Artifact          | Role                                                        |
| ----------------- | ----------------------------------------------------------- |
| `app/globals.css` | Semantic OKLCH tokens + `@theme inline` maps shadcn expects |
| `components.json` | CLI config (`style`, `baseColor`, aliases, registries)      |
| `components/ui/*` | Components that consume those tokens via Tailwind utilities |

**daaysorn extensions on top of that scaffold** (do not confuse with the shadcn export itself):

- Font roles: Geist / Montserrat / JetBrains Mono in `app/layout.tsx` + base-layer heading/code rules
- Breakpoints: `watch` + `xs` in a plain `@theme` block
- Theme hotkey + default dark in `ThemeProvider`
- Product shell / nav / dock

Because the token **names** match the shadcn contract, any component from `npx shadcn@latest add …` themes automatically against this file.

---

## 3. Color system

Colors are defined in **OKLCH** for perceptual uniformity. They are exposed as Tailwind utilities via `@theme inline` in `app/globals.css`.

### 3.1 Semantic roles

| Token                                | Tailwind utilities                         | Role                    |
| ------------------------------------ | ------------------------------------------ | ----------------------- |
| `background`                         | `bg-background`                            | Page canvas             |
| `foreground`                         | `text-foreground`                          | Default text            |
| `card` / `card-foreground`           | `bg-card` `text-card-foreground`           | Elevated surfaces       |
| `popover` / `popover-foreground`     | `bg-popover` `text-popover-foreground`     | Floating panels         |
| `primary` / `primary-foreground`     | `bg-primary` `text-primary-foreground`     | Brand / high emphasis   |
| `secondary` / `secondary-foreground` | `bg-secondary` `text-secondary-foreground` | Secondary actions       |
| `muted` / `muted-foreground`         | `bg-muted` `text-muted-foreground`         | Quiet chrome / captions |
| `accent` / `accent-foreground`       | `bg-accent` `text-accent-foreground`       | Subtle hover/highlight  |
| `destructive`                        | `bg-destructive` `text-destructive`        | Errors / danger         |
| `success`                            | `bg-success` `text-success`                | Success / safe cancel   |
| `border`                             | `border-border`                            | Default borders         |
| `input`                              | `border-input` `bg-input`                  | Form control edges      |
| `ring`                               | `ring-ring`                                | Focus rings             |
| `chart-1` … `chart-5`                | `bg-chart-1` …                             | Data viz scale          |
| `sidebar*`                           | `bg-sidebar` `text-sidebar-foreground` …   | Sidebar kit (shadcn)    |

### 3.2 Light theme (`:root`)

| Token                     | OKLCH                         | Approx. feel      |
| ------------------------- | ----------------------------- | ----------------- |
| `--background`            | `oklch(1 0 0)`                | Pure white        |
| `--foreground`            | `oklch(0.145 0 0)`            | Near-black        |
| `--card`                  | `oklch(1 0 0)`                | White             |
| `--primary`               | `oklch(0.205 0 0)`            | Dark charcoal     |
| `--primary-foreground`    | `oklch(0.985 0 0)`            | Off-white         |
| `--secondary`             | `oklch(0.97 0 0)`             | Soft gray fill    |
| `--muted`                 | `oklch(0.97 0 0)`             | Soft gray fill    |
| `--muted-foreground`      | `oklch(0.556 0 0)`            | Mid gray text     |
| `--accent`                | `oklch(0.97 0 0)`             | Soft gray         |
| `--destructive`           | `oklch(0.577 0.245 27.325)`   | Warm red          |
| `--success`               | `oklch(0.527 0.154 150.069)`  | Accessible green  |
| `--border` / `--input`    | `oklch(0.922 0 0)`            | Light hairline    |
| `--ring`                  | `oklch(0.708 0 0)`            | Medium gray focus |
| `--chart-1` → `--chart-5` | `0.87` → `0.269` (achromatic) | Gray ramp         |
| `--sidebar`               | `oklch(0.985 0 0)`            | Near-white        |

**Light preview (conceptual swatches):**

```
 background ████  foreground ████  primary ████  muted-fg ████  destructive ████
     white        near-black      charcoal      mid-gray         warm red
```

### 3.3 Dark theme (`.dark`)

| Token                                  | OKLCH                        | Approx. feel                                  |
| -------------------------------------- | ---------------------------- | --------------------------------------------- |
| `--background`                         | `oklch(0.145 0 0)`           | Near-black                                    |
| `--foreground`                         | `oklch(0.985 0 0)`           | Off-white                                     |
| `--card` / `--popover`                 | `oklch(0.205 0 0)`           | Elevated dark                                 |
| `--primary`                            | `oklch(0.922 0 0)`           | Light gray (inverted)                         |
| `--primary-foreground`                 | `oklch(0.205 0 0)`           | Dark on light primary                         |
| `--secondary` / `--muted` / `--accent` | `oklch(0.269 0 0)`           | Dark gray fills                               |
| `--muted-foreground`                   | `oklch(0.708 0 0)`           | Soft gray text                                |
| `--destructive`                        | `oklch(0.704 0.191 22.216)`  | Brighter warm red                             |
| `--success`                            | `oklch(0.723 0.191 149.579)` | Brighter accessible green                     |
| `--border`                             | `oklch(1 0 0 / 10%)`         | White @ 10%                                   |
| `--input`                              | `oklch(1 0 0 / 15%)`         | White @ 15%                                   |
| `--ring`                               | `oklch(0.556 0 0)`           | Mid gray                                      |
| `--sidebar-primary`                    | `oklch(0.488 0.243 264.376)` | **Only chromatic brand accent** (violet-blue) |

**Dark preview (conceptual swatches):**

```
 background ████  foreground ████  primary ████  muted-fg ████  sidebar-primary ████
   near-black      off-white      light gray     soft gray         violet accent
```

### 3.4 Chart ramp

Used for sequential data. Same values in light and dark currently:

| Token     | Lightness | Use             |
| --------- | --------- | --------------- |
| `chart-1` | 0.87      | Lightest series |
| `chart-2` | 0.556     |                 |
| `chart-3` | 0.439     | Mid             |
| `chart-4` | 0.371     |                 |
| `chart-5` | 0.269     | Darkest series  |

### 3.5 How to use color

```tsx
// Correct — semantic
<p className="text-muted-foreground">Caption</p>
<span className="font-semibold text-primary">Brand emphasis</span>
<div className="bg-background text-foreground border border-border" />

// Avoid — raw colors break theming
<p className="text-gray-500">Caption</p>
```

**In product today (**`components/nav/footer.tsx`**):**

- Body copy → `text-muted-foreground`
- Emphasis (app name, song title) → `font-semibold text-primary`
- Social icons → `text-primary` with `opacity-80` → `hover:opacity-100`

### 3.6 Muted text & quiet chrome

Muted is the system language for “secondary, not inactive.” Use it for captions, metadata, helper copy, idle icons, and supporting labels — never for primary CTAs.

| Role                           | Utility                                         | When                                                        |
| ------------------------------ | ----------------------------------------------- | ----------------------------------------------------------- |
| Quiet body / caption           | `text-muted-foreground`                         | Footer copy, dialog descriptions, “by Artist”, empty states |
| Quiet fill                     | `bg-muted`                                      | Skeleton bars, soft chips, ghost hover targets              |
| De-emphasized icon (idle)      | `text-muted-foreground`                         | Spotify glyph when not playing                              |
| Soft opacity on primary chrome | `text-primary opacity-80` → `hover:opacity-100` | Social icons (still brand-colored, just quieter)            |
| Half-muted indicator           | `bg-muted-foreground/50`                        | Inactive equalizer / status dots                            |

```tsx
{
  /* Hierarchy in one line */
}
;<span className="text-sm text-muted-foreground">
  <span className="font-semibold text-primary">Song Title</span> by Artist
</span>

{
  /* Caption */
}
;<p className="text-sm text-muted-foreground">Supporting copy</p>

{
  /* Micro mono hint */
}
;<p className="font-mono text-xs text-muted-foreground">
  Press <kbd>d</kbd>…
</p>
```

**Rules**

- Prefer `text-muted-foreground` over `text-gray-*` / opacity-only greys.
- Do not use muted for the main action label — that stays `text-primary` or `Button`.
- Empty / idle UI stays muted; live / playing may promote icon color (e.g. brand accent) while surrounding copy stays muted.

---

## 4. Typography

### 4.1 Font families

Defined in `app/layout.tsx` via `next/font/google`, applied as CSS variables on `<html>`.

| Role              | Family             | CSS variable     | Tailwind class | Applied to                            |
| ----------------- | ------------------ | ---------------- | -------------- | ------------------------------------- |
| Body / paragraphs | **Geist**          | `--font-sans`    | `font-sans`    | `html` (default)                      |
| Headings          | **Montserrat**     | `--font-heading` | `font-heading` | `h1`–`h6` (base layer)                |
| Code              | **JetBrains Mono** | `--font-mono`    | `font-mono`    | `code`, `kbd`, `samp`, `pre` + opt-in |

```tsx
// app/layout.tsx (conceptual)
Montserrat  → variable: "--font-heading"
Geist       → variable: "--font-sans"
JetBrains_Mono → variable: "--font-mono"
```

```css
/* app/globals.css — base layer */
html {
  @apply font-sans;
}
h1,
h2,
h3,
h4,
h5,
h6 {
  @apply font-heading;
}
code,
kbd,
samp,
pre {
  @apply font-mono;
}
```

### 4.2 Type preview

```
HEADING (Montserrat)     The quick brown fox — Project ready!
BODY (Geist)             You may now add components and start building.
CODE (JetBrains Mono)    (Press d to toggle dark mode)
```

### 4.3 Scale & weight (practical)

Tailwind default type scale is in use. Patterns already in the repo:

| Pattern          | Classes                                     | Where                |
| ---------------- | ------------------------------------------- | -------------------- |
| Page title       | `font-medium` on `h1` (inherits Montserrat) | `views/homeView.tsx` |
| Body             | default `text-base` / inherited             | home + footer        |
| Caption / helper | `text-sm text-muted-foreground`             | footer               |
| Micro mono hint  | `font-mono text-xs text-muted-foreground`   | homeView             |
| Emphasis         | `font-semibold text-primary`                | footer               |
| Medium chrome    | `font-medium`                               | footer wrapper       |
| Button label     | `text-sm font-medium`                       | `button.tsx`         |
| Tooltip label    | `text-xs`                                   | `tooltip.tsx`        |

### 4.4 Antialiasing & scroll

Root `<html>` also carries:

- `antialiased` — smoother glyph edges
- `scroll-smooth` — smooth in-page scrolling

---

## 5. Radius & shape

Base radius token:

```css
--radius: 0.625rem; /* 10px */
```

Derived scale in `@theme inline`:

| Token          | Formula      | Computed          | Tailwind      |
| -------------- | ------------ | ----------------- | ------------- |
| `--radius-sm`  | `× 0.6`      | `0.375rem` (6px)  | `rounded-sm`  |
| `--radius-md`  | `× 0.8`      | `0.5rem` (8px)    | `rounded-md`  |
| `--radius-lg`  | `= --radius` | `0.625rem` (10px) | `rounded-lg`  |
| `--radius-xl`  | `× 1.4`      | `0.875rem` (14px) | `rounded-xl`  |
| `--radius-2xl` | `× 1.8`      | `1.125rem` (18px) | `rounded-2xl` |
| `--radius-3xl` | `× 2.2`      | `1.375rem` (22px) | `rounded-3xl` |
| `--radius-4xl` | `× 2.6`      | `1.625rem` (26px) | `rounded-4xl` |

### Shape preview

```
sm  ▢▢      md  ▢▢▢     lg  ▢▢▢▢     xl  ▢▢▢▢▢
2xl ▢▢▢▢▢▢  …up to 4xl

Button default: rounded-md
Dock shell:     rounded-2xl
Dock icons:     rounded-full
Tooltip:        rounded-md (+ arrow rounded-[2px])
```

**Button size-specific caps** (from `button.tsx`):

- `xs` / `icon-xs`: `rounded-[min(var(--radius-md),8px)]`
- `sm` / `icon-sm`: `rounded-[min(var(--radius-md),10px)]`

---

## 6. Spacing, layout & shell

### 6.1 App shell (`app/layout.tsx`)

```tsx
<div className="flex min-h-svh max-w-md min-w-0 flex-col p-6">
  <Header />
  {children}
  <Footer />
</div>
```

| Constraint | Value                  | Meaning                                     |
| ---------- | ---------------------- | ------------------------------------------- |
| Height     | `min-h-svh`            | At least one small viewport height          |
| Padding    | `p-6`                  | `1.5rem` inset on all sides                 |
| Width      | `max-w-md`             | Caps at `28rem` / **448px**                 |
| Flex       | `flex-col` + `min-w-0` | Vertical stack; prevents flex overflow bugs |

> **Design rule:** Every page body stays within the shared `<main>` column used by Home so its left and right edges remain consistent. Page roots use `w-full min-w-0`. Do not create viewport-width breakouts, negative translations, or page-specific horizontal offsets unless a wider page is explicitly requested.

### 6.2 Spacing rhythm in use

| Utility       | Rem      | Use in product           |
| ------------- | -------- | ------------------------ |
| `gap-1.5`     | 0.375rem | Button inner gap         |
| `gap-2`       | 0.5rem   | Dock icon gap            |
| `gap-3`       | 0.75rem  | Social icon row          |
| `gap-4`       | 1rem     | Footer sections          |
| `p-2`         | 0.5rem   | Dock padding             |
| `p-6`         | 1.5rem   | Shell padding            |
| `mt-2`        | 0.5rem   | Button under copy (home) |
| `mt-8`        | 2rem     | Dock top margin          |
| `px-3 py-1.5` | —        | Tooltip padding          |
| `bottom-5`    | 1.25rem  | Fixed footer offset      |

### 6.3 Layout preview

```
┌──────────── max-w-md (448px) ────────────┐
│  p-6                                      │
│  ┌────────────────────────────────────┐   │
│  │ Header                             │   │
│  ├────────────────────────────────────┤   │
│  │ children (views)                   │   │
│  │                                    │   │
│  └────────────────────────────────────┘   │
│                                           │
│  ┌─ footer fixed bottom-5 ────────────┐   │
│  │ © / App   last played…   socials   │   │
│  └────────────────────────────────────┘   │
└───────────────────────────────────────────┘
```

---

## 7. Breakpoints — philosophy, approach & how it helps

> **Source of truth:** `app/globals.css` → plain `@theme { --breakpoint-* }` block  
> **Principle:** Extend Tailwind where phones and wearables need language; keep Tailwind where the ecosystem already agrees.

---

### 7.1 The misconception: “Tailwind doesn’t follow standard screen sizes”

It doesn’t follow **device marketing names** — and neither does Bootstrap, MUI, or most mature systems. What looks like a bug is a deliberate design choice.

| Expectation                                | Reality                                                                        |
| ------------------------------------------ | ------------------------------------------------------------------------------ |
| “`sm` = smartphone”                        | In Tailwind, `sm` ≈ **640px** = large phone _landscape_ / small tablet         |
| “There is one industry standard”           | Tailwind ≠ Bootstrap ≠ MUI — they disagree on the first tier                   |
| “Breakpoints should match iPhone 12 (390)” | Frameworks break where **layouts** usually reflow, not per SKU                 |
| “CSS px = physical pixels”                 | CSS pixels are density-independent; iPhone 12 is **390 CSS px** wide, not 1170 |

**Framework comparison (first useful tier upward):**

| System           | First named tier | Tablet-ish | Laptop-ish | Desktop   | Wide       |
| ---------------- | ---------------- | ---------- | ---------- | --------- | ---------- |
| **Tailwind CSS** | `sm` 640px       | `md` 768   | `lg` 1024  | `xl` 1280 | `2xl` 1536 |
| **Bootstrap 5**  | `sm` 576px       | `md` 768   | `lg` 992   | `xl` 1200 | `xxl` 1400 |
| **MUI**          | `sm` 600px       | `md` 900   | `lg` 1200  | `xl` 1536 | —          |

There is no single “correct” pixel table. Industry guidance (2025–2026) converges on:

1. **Mobile-first** (`min-width`)
2. Break where **your content** breaks
3. Keep the scale **lean**
4. In Tailwind v4, define breakpoints in **rem** so variants sort correctly

So: Tailwind _is_ a mainstream standard for utility CSS — it just isn’t an Apple/Google device catalog.

---

### 7.2 Are we “not following Tailwind”?

**No — we follow Tailwind’s defaults for** `sm` **→** `2xl`**, and only extend below them.**

| Layer                             | Decision                     | Why                                                                       |
| --------------------------------- | ---------------------------- | ------------------------------------------------------------------------- |
| `sm` / `md` / `lg` / `xl` / `2xl` | **Keep Tailwind values**     | shadcn, Magic UI, docs, and muscle memory all assume these                |
| `xs`                              | **Add** (`22.5rem` / 360px)  | Tailwind has no phone-tier between 0 and 640 — but real phones live there |
| `watch`                           | **Add** (`18.75rem` / 300px) | Wearables / ultra-narrow need an escape hatch Tailwind never shipped      |

We are **not**:

- Replacing Tailwind’s scale with Bootstrap’s
- Renaming `sm` to mean “iPhone”
- Inventing a 12-step device matrix
- Hard-coding px breakpoints (breaks Tailwind’s rem sort order)

We **are**:

- Speaking clearly about phones (`xs`) and ultra-narrow (`watch`)
- Staying compatible with every `md:flex` example in the ecosystem
- Documenting that **phone UI = unprefixed base styles**, enhanced by `xs:` when needed

Think of it as:

```
Tailwind defaults ………………………………… kept intact (ecosystem)
         ↓
daaysorn extensions ……… watch + xs (product reality below 640px)
```

---

### 7.3 The problem Tailwind leaves open (and why that hurt us)

Tailwind’s first named breakpoint is **640px**. Everything below that is one bucket: “base.”

But our product reality includes:

| Viewport  | Example                                 | Tailwind language available? |
| --------- | --------------------------------------- | ---------------------------- |
| ~150px    | Native Apple Watch (adaptations off)    | ❌ none                      |
| 320px     | iPhone SE, watchOS default emulation    | ❌ none (still “base”)       |
| 360–390px | Most modern phones, **iPhone 12 = 390** | ❌ none (still “base”)       |
| 430px     | Pro Max class                           | ❌ none (still “base”)       |
| 640px+    | Landscape phones / small tablets        | ✅ `sm:`                     |

Without `xs` / `watch`, teams either:

1. Stuff all phone work into unprefixed classes (fine until you need a _second_ phone step), or
2. Misuse `sm:` for “phone,” which **never fires on iPhone 12**, or
3. Sprinkle arbitrary `min-[390px]:` everywhere — unmaintainable

That is the gap daaysorn closes.

---

### 7.4 Our approach (concrete)

#### Design rules

1. **Base first** — every layout must read well from 0px up (true mobile-first).
2. `xs:` **for modern phones** — use when 360px+ deserves a step up from SE-class / ultra-tight.
3. `sm:` **and above = Tailwind meaning** — never redefine them as “phones.”
4. `max-watch:` **for glanceable mode** — hide chrome, tighten type; don’t rebuild the brand for the wrist.
5. **Prefer few breakpoints per component** — usually base + one of `xs` / `md` / `lg`.

#### Implemented tokens (`app/globals.css`)

```css
@theme {
  --breakpoint-watch: 18.75rem; /* 300px — wearables / ultra-narrow */
  --breakpoint-xs: 22.5rem; /* 360px — compact → modern phones */
  /* sm 40rem · md 48rem · lg 64rem · xl 80rem · 2xl 96rem = Tailwind defaults */
}
```

> **Implementation note:** Breakpoints must live in a plain `@theme { }` block, **not** `@theme inline`. Inline theme maps colors/fonts; breakpoint namespaces need the standard `@theme` so Tailwind generates `watch:` / `xs:` / `max-`* variants and sorts them by size.

#### Full scale

| Prefix   | Min width  | ≈ px     | Role in daaysorn                                        |
| -------- | ---------- | -------- | ------------------------------------------------------- |
| _(base)_ | `0`        | 0        | Default phone / tiny UI — **always start here**         |
| `watch:` | `18.75rem` | **300**  | Crossed “ultra-narrow” floor (rarely used as min-width) |
| `xs:`    | `22.5rem`  | **360**  | Modern compact phones (includes iPhone 12 at 390)       |
| `sm:`    | `40rem`    | **640**  | Large phone landscape / small tablet — **Tailwind**     |
| `md:`    | `48rem`    | **768**  | Tablet portrait — **Tailwind**                          |
| `lg:`    | `64rem`    | **1024** | Laptop / tablet landscape — **Tailwind**                |
| `xl:`    | `80rem`    | **1280** | Desktop — **Tailwind**                                  |
| `2xl:`   | `96rem`    | **1536** | Wide / 1440p+ — **Tailwind**                            |

#### Mental model

```
0 ──────── 300 ────── 360 ──────────── 640 ── 768 ── 1024 ── 1280 ── 1536
│  base    │  watch:  │  xs:           │ sm: │ md: │  lg:  │  xl:  │ 2xl:
│          │          │                │     │     │       │       │
│  SE 320  │          │  iPhone 12 390 │     │ iPad│laptop │desk   │wide
│  watch*  │          │  Pro Max 430   │     │     │       │       │
│          └ daaysorn extensions ──────┘     └──── Tailwind defaults ────┘
```

Native watch CSS widths (~136–184) sit **below** 300 when `disabled-adaptations` is on.

---

### 7.5 How this helps (product & engineering)

| Benefit                         | Without our scale                                         | With `watch` + `xs` + Tailwind defaults         |
| ------------------------------- | --------------------------------------------------------- | ----------------------------------------------- |
| **Correct phone targeting**     | Devs put “phone” styles in `sm:` → invisible on iPhone 12 | Phone = base; polish = `xs:`                    |
| **iPhone 12 clarity**           | “Which breakpoint is 390?” → confusion                    | Documented: **base +** `xs:`, never `sm:`       |
| **SE vs modern phones**         | One cramped base for 320 and 430                          | `xs:` can loosen type/spacing from 360 up       |
| **Wearable / ultra-narrow**     | Arbitrary `max-[300px]:` or ignored                       | Named `max-watch:` for intentional glance UI    |
| **shadcn / docs compatibility** | Custom full scale breaks copy-paste examples              | `md:` / `lg:` still mean what Tailwind means    |
| **Fewer magic numbers**         | `min-[390px]:`, `min-[375px]:` scattered                  | One token language for the team                 |
| **Onboarding**                  | “Why doesn’t `sm:` work on my phone?”                     | Design system answers in one place              |
| **Shell strategy**              | `max-w-md` alone, no responsive vocabulary                | Same shell + clear when to widen (`md:`, `lg:`) |

**Especially for daaysorn’s current shell** (`max-w-md` / 448px phone column): almost all real phones never hit `sm:`. Extending _below_ Tailwind is what makes responsive language useful for this product shape.

---

### 7.6 Device ground truth → which prefixes fire?

| Device / class                        | CSS width          | Active prefixes                     |
| ------------------------------------- | ------------------ | ----------------------------------- |
| Apple Watch (native, adaptations off) | ~136–184           | base only → style with `max-watch:` |
| Apple Watch (default WebKit)          | **320** (emulated) | base + `watch:`                     |
| iPhone SE (older)                     | 320                | base + `watch:`                     |
| Compact Android                       | 360                | base + `watch:` + `xs:`             |
| **iPhone 12 / 13 / 14**               | **390**            | base + `watch:` + `xs:`             |
| iPhone 14/15 Pro Max                  | 430                | same                                |
| Phone landscape / small tablet        | ≥640               | + `sm:`                             |
| iPad portrait                         | 768                | + `md:`                             |
| Laptop                                | 1024+              | + `lg:`                             |

**iPhone 12 Pro checklist**

```tsx
// ✅ Correct — fires at 390
<p className="text-sm xs:text-base">…</p>

// ❌ Wrong — sm starts at 640; never runs on iPhone 12 portrait
<p className="text-sm sm:text-base">…</p>
```

---

### 7.7 Smartwatches — why we include them (and how far)

**Include the token. Don’t rebuild the site for the wrist.**

| Fact                                                                       | Design implication                        |
| -------------------------------------------------------------------------- | ----------------------------------------- |
| watchOS Safari **fakes 320px** and shrink-to-fit by default                | Most visitors never hit true watch width  |
| True ~136–184px needs `<meta name="disabled-adaptations" content="watch">` | Opt-in only for specialist / glance pages |
| Traffic share is tiny for portfolio/marketing                              | Optimize _selectively_, not globally      |

**Recommended use of** `watch`**:**

| Pattern            | When                                           |
| ------------------ | ---------------------------------------------- |
| `max-watch:hidden` | Hide footer socials, dock, secondary chrome    |
| `max-watch:text-*` | Shorter, denser glance copy                    |
| Unprefixed base    | Must already be readable if scaled down at 320 |

Do **not** put primary brand layout inside `watch:` min-width alone — that would target “everything ≥300px,” which is almost the whole web.

---

### 7.8 Usage recipes

```tsx
{/* Phone default → modern phone polish → tablet */}
<div className="flex flex-col gap-3 xs:gap-4 md:flex-row md:gap-6" />

{/* Desktop nav: hidden on phones, shown from tablet */}
<nav className="hidden md:flex" />

{/* Phone-only padding */}
<div className="max-md:px-4" />

{/* Ultra-narrow / watch glance mode */}
<header className="max-watch:py-2" />
<nav className="max-watch:hidden" />

{/* Widen the app shell only when the viewport can use it */}
<div className="mx-auto max-w-md md:max-w-2xl lg:max-w-4xl" />
```

`max-watch:`, `max-xs:`, `max-sm:`, … are generated automatically from the same tokens.

---

### 7.9 Anti-patterns (don’t do these)

| Anti-pattern                                                  | Why it fails                              |
| ------------------------------------------------------------- | ----------------------------------------- |
| Using `sm:` to mean “smartphone”                              | Misses every iPhone portrait viewport     |
| Overriding `sm`/`md` to 390/768 “because Apple”               | Breaks shadcn examples and team intuition |
| Defining breakpoints in `px` while keeping rem defaults       | Tailwind may **mis-sort** variants        |
| Putting breakpoints only in `@theme inline`                   | Variants may not generate as expected     |
| Designing desktop-first then fighting with `max-*` everywhere | Fights mobile-first cascade               |
| Ten device-specific breakpoints                               | Unmaintainable; devices change yearly     |

---

### 7.10 Summary — our stance in one paragraph

**We follow Tailwind for tablet → wide (**`sm`**–**`2xl`**) so the ecosystem stays coherent. We do not pretend Tailwind’s** `sm` **means “phone.”** Phones (including iPhone 12 at 390 CSS px) live in **base**, with `xs:` as our named step for modern compact screens, and `watch:` **/** `max-watch:` as an intentional ultra-narrow / wearable escape hatch. That combination is more honest about real CSS viewports, keeps shadcn compatible, and gives daaysorn a precise language for the widths we actually ship to.

---

## 8. Motion & interaction

### 8.1 Global interaction rules

From `app/globals.css`: enabled `button` and `[role="button"]` elements use the pointer affordance on hover (see the base layer in that file).

Page and route reveals are CSS-first. `AppShell` uses
`shell-transition-pending` for the initial component entrance and
`app/template.tsx` uses `page-transition-pending` for route-body transitions.
The keyframes live in `app/globals.css`, finish in roughly `0.6s`, and remove
motion under `prefers-reduced-motion: reduce`. Do not add GSAP or another
JavaScript animation runtime for these simple opacity/translate effects.

### 8.2 Button motion (`components/ui/button.tsx`)

| State              | Behavior                              |
| ------------------ | ------------------------------------- |
| Default            | `transition-all`                      |
| Active (non-popup) | `translate-y-px` (1px press)          |
| Focus visible      | `border-ring` + `ring-3 ring-ring/50` |
| Disabled           | `pointer-events-none opacity-50`      |
| Invalid            | destructive border + ring             |

### 8.3 Footer socials (`components/nav/footer.tsx`)

```
opacity-80 → hover:opacity-100
hover:-translate-y-1 hover:scale-110
transition-all duration-300 ease-out
```

Tooltip delay: `delayDuration={150}`, `skipDelayDuration={100}`, `sideOffset={8}`.

### 8.4 Dock magnification (`components/ui/dock.tsx`)

| Prop                   | Default                                   | Meaning                     |
| ---------------------- | ----------------------------------------- | --------------------------- |
| `iconSize`             | `40`                                      | Resting icon box            |
| `iconMagnification`    | `60`                                      | Peak size under the pointer |
| `iconDistance`         | `140`                                     | Influence radius (px)       |
| `disableMagnification` | `false`                                   | Flat hover fallback         |
| Spring                 | mass `0.1`, stiffness `150`, damping `12` | Snappy dock physics         |

Shell classes: frosted glass (`backdrop-blur-md`, `bg-white/10` / `dark:bg-black/10`), `h-[58px]`, `rounded-2xl`, `border`.

### 8.5 Tooltip enter/exit

Uses `tw-animate-css` patterns: `animate-in` / `fade-in-0` / `zoom-in-95` on open; reverse on close. Side-aware slide (`slide-in-from-*-2`).

### 8.6 Theme toggle

Press `d` (no modifiers, not while typing in inputs) to toggle light ↔ dark. Implemented in `components/theme-provider.tsx` (`ThemeHotkey`). Transitions on theme change are disabled (`disableTransitionOnChange`).

### 8.7 Ghost, loaders & feedback motion

#### Ghost (transparent chrome)

“Ghost” means no permanent fill — presence appears on interaction.

| Pattern                | How                                                                                                                  |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Button `ghost`**     | `<Button variant="ghost">` — transparent resting; `hover:bg-muted hover:text-foreground` (dark: `hover:bg-muted/50`) |
| **Ghost icon / close** | `text-muted-foreground hover:bg-accent hover:text-foreground` (see dialog close)                                     |
| **Ghost social**       | Primary-colored icon at `opacity-80`, full opacity + lift on hover                                                   |

```tsx
<Button variant="ghost" size="icon" aria-label="More">
  …
</Button>
```

Use ghost for secondary actions in dense chrome (toolbars, dialogs, icon rows). Prefer `default` / `outline` for primary path actions.

#### Loaders & skeletons

| Kind             | Classes / utility                                    | Timing                          | Use                                             |
| ---------------- | ---------------------------------------------------- | ------------------------------- | ----------------------------------------------- |
| **Skeleton bar** | `animate-pulse rounded bg-muted` (+ fixed `h-* w-*`) | Tailwind default pulse          | Loading placeholders (e.g. now-playing fetch)   |
| **Pulse (live)** | `motion-safe:animate-pulse` or `animate-music-pulse` | music-pulse: **1.8s** ease      | Playing indicator / logo while track is live    |
| **Text shimmer** | `motion-safe:animate-text-shimmer`                   | **5.5s** `ease-in-out` infinite | Sweeping glint on muted live text (artist name) |

```tsx
{
  /* Skeleton — keep layout stable */
}
;<span className="inline-block h-3 w-40 animate-pulse rounded bg-muted align-middle" />

{
  /* Live pulse (respect reduced motion) */
}
;<Icon className={cn(isPlaying && "motion-safe:animate-pulse")} />

{
  /* Artist shimmer while playing */
}
;<span className={cn(isPlaying && "motion-safe:animate-text-shimmer")}>
  {artist}
</span>
```

**Shimmer tokens** (`app/globals.css`) — theme-aware, derived from muted/foreground:

| Token             | Light                     | Dark                                    |
| ----------------- | ------------------------- | --------------------------------------- |
| `--shimmer-base`  | `var(--muted-foreground)` | same                                    |
| `--shimmer-glint` | `var(--foreground)`       | mix of foreground into muted-foreground |

Defined via `@utility animate-text-shimmer` and `@utility animate-music-pulse`.

**Rules**

- Always prefer `motion-safe:` for decorative loops so `prefers-reduced-motion` users get a calm UI.
- Skeletons use `bg-muted`, never raw greys.
- Shimmer is for **live muted text**, not for every caption.
- Keep shimmer slow (`~5.5s ease-in-out`) — do not speed it into a strobe.
- Stagger related pulses with `animation-delay` when sequencing (e.g. icon then title).

### 8.8 Performance, previews & perceived speed

Performance choices are design choices because they control how quickly the
interface settles, whether skeletons flash, and whether navigation feels calm.

| Pattern                | Rule                                                                                                                                                                           |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Static composition     | Render headings, prose, layout and non-interactive media in Server Components. Use a small client island only for browser state, gestures, dialogs, realtime or form behavior. |
| Internal link preview  | Use the route's generated OG image or a stored static preview. Never render the full local page in an iframe.                                                                  |
| External preview       | Prefer a generated screenshot cached in R2 or another durable asset store. Avoid rebuilding the same preview on each hover.                                                    |
| Skeleton lifecycle     | Match the final box size, use `bg-muted`, and stop showing it after that preview has settled during the session.                                                               |
| Decorative motion      | Prefer CSS transitions/keyframes with `motion-safe:` and an explicit reduced-motion state.                                                                                     |
| Physics/gesture motion | A focused client library is acceptable only when continuous pointer or gesture calculations are the interaction itself, such as Dock magnification.                            |

A preview is visual context, not an embedded copy of the destination. Hovering
it must not boot the destination's analytics, Spotify polling, database reads,
realtime connection, or service worker.

### 8.9 Open Graph — page template (PageLightSwiss)

Static and content pages use the shared page OG template via
`createPageOgImage` (`lib/og-page.ts`) → `renderPageOgImage` (`lib/og-image.tsx`).
Home identity art still uses `renderOgImage` variants.

| Field         | Rule                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| `title`       | Short page name (Montserrat, large).                                                                      |
| `description` | **One line only** — never wrap. Keep copy short (roughly **≤72 characters**). Template uses `nowrap`.     |
| `path`        | Display path such as `daaysorn.com/privacy` (use `formatOgSitePath`).                                     |
| `labels`      | Optional footer chips (first label emphasized).                                                           |

```tsx
// app/<route>/opengraph-image.tsx
import { createPageOgImage } from "@/lib/og-page"

const og = createPageOgImage({
  title: "Privacy Policy",
  description: "How daaysorn collects, uses, and protects information.", // one line
  path: "/privacy",
  labels: ["Legal", "Privacy", "Data"],
})

export const alt = og.alt
export const size = og.size
export const contentType = og.contentType
export default og.Image
```

```tsx
// app/<route>/twitter-image.tsx
export { alt, contentType, default, size } from "./opengraph-image"
```

Internal hover previews resolve with `localOpenGraphImageSrc(href)` from
`@/lib/og-path` → `/<path>/opengraph-image`. Do not hard-code per-route
preview URLs. Never import `@/lib/og-page` or `@/lib/og-image` from Client
Components — those modules use `next/og` / Node APIs.

**Anti-pattern:** multi-line OG subtitles, long marketing paragraphs under the
title, or inventing a second OG layout for ordinary pages.

---

## 9. Theming

### 9.1 Provider config

```tsx
// components/theme-provider.tsx
<NextThemesProvider
  attribute="class"      // toggles .dark on <html>
  defaultTheme="dark"
  enableSystem
  disableTransitionOnChange
>
```

Dark variant wiring in CSS:

```css
@custom-variant dark (&:is(.dark *));
```

### 9.2 Modes

| Mode     | Behavior                            |
| -------- | ----------------------------------- |
| `dark`   | Default                             |
| `light`  | `:root` tokens                      |
| `system` | Follows OS preference when selected |

### 9.3 Authoring dark-only tweaks

Prefer semantic tokens. When needed, use Tailwind dark variants:

```tsx
className = "border border-border dark:bg-input/30"
```

Avoid pairing two theme variants that set the same CSS property unless the component intentionally needs that override. Button variants already handle their own dark-state details.

### 9.4 Using this system with shadcn

You are already on the shadcn theming path. Components read CSS variables through Tailwind (`bg-primary`, `text-muted-foreground`, `border-border`, …).

**Add components**

```bash
npx shadcn@latest add button
npx shadcn@latest add @magicui/<name>   # via components.json registries
```

**Change the whole visual theme**

Edit or replace the **values** in `app/globals.css` (`:root` + `.dark`). Keep the **same token names**. Every shadcn/daaysorn component restyles with no TSX edits.

You can regenerate a new palette from [ui.shadcn.com/create](https://ui.shadcn.com/create) and paste the new `:root` / `.dark` (and related) token blocks into `globals.css` — as long as you preserve:

1. Semantic token names (`--background`, `--primary`, `--radius`, …)
2. `@theme inline` mappings (`--color-primary: var(--primary)`, …)
3. Our daaysorn additions you still want (font CSS vars, `watch`/`xs` breakpoints, heading/code base rules)

**Do not** rename tokens or hard-code hex/oklch in `components/ui`. That is what breaks portability and shadcn.

---

## 10. Components

### 10.1 Button — `components/ui/button.tsx`

Built with CVA + Radix `Slot` (`asChild`). Data attributes: `data-slot="button"`, `data-variant`, `data-size`.

#### Variants

| Variant       | Preview          | Classes (summary)                                                |
| ------------- | ---------------- | ---------------------------------------------------------------- |
| `default`     | Filled primary   | `bg-primary text-primary-foreground hover:bg-primary/80`         |
| `outline`     | Bordered surface | `border-border bg-background shadow-xs` + dark input mix         |
| `secondary`   | Soft fill        | `bg-secondary` + OKLCH mix hover                                 |
| `ghost`       | Transparent      | Resting empty; `hover:bg-muted hover:text-foreground` (see §8.7) |
| `destructive` | Soft danger      | `bg-destructive/10 text-destructive`                             |
| `link`        | Text link        | `underline-offset-4 hover:underline`                             |

#### Sizes

| Size      | Height / box | Notes                     |
| --------- | ------------ | ------------------------- |
| `default` | `h-9`        | Standard                  |
| `xs`      | `h-6`        | `text-xs`, tighter radius |
| `sm`      | `h-8`        |                           |
| `lg`      | `h-10`       |                           |
| `icon`    | `size-9`     | Square                    |
| `icon-xs` | `size-6`     |                           |
| `icon-sm` | `size-8`     |                           |
| `icon-lg` | `size-10`    |                           |

#### Visual preview

```
[ Default ]  [ Outline ]  [ Secondary ]  [ Ghost ]  [ Destructive ]  Link →
   h-9          h-9            h-9          h-9           h-9

[xs] [sm] [default] [lg]     [■] icon-xs  [■] icon-sm  [■] icon  [■] icon-lg
```

#### Usage

```tsx
import { Button } from "@/components/ui/button"

<Button>Button</Button>
<Button variant="outline" size="sm">Save</Button>
<Button variant="destructive">Delete</Button>
<Button size="icon" aria-label="Settings">{/* icon */}</Button>
<Button asChild>
  <Link href="/about">About</Link>
</Button>
```

---

### 10.2 Tooltip — `components/ui/tooltip.tsx`

Radix Tooltip compound API:

| Export            | Role                                                           |
| ----------------- | -------------------------------------------------------------- |
| `TooltipProvider` | Context; default `delayDuration={0}` (footer overrides to 150) |
| `Tooltip`         | Root                                                           |
| `TooltipTrigger`  | Trigger (`asChild` supported)                                  |
| `TooltipContent`  | Portal content; inverted colors                                |

**Look:** `bg-foreground text-background` (inverted chip), `text-xs`, `rounded-md`, arrow matching foreground.

```
        ┌─────────┐
        │ GitHub  │  ← TooltipContent
        └────┬────┘
             ▼
            [⬡]      ← trigger (icon link)
```

```tsx
<TooltipProvider delayDuration={150}>
  <Tooltip>
    <TooltipTrigger asChild>
      <Link href="…" aria-label="GitHub">
        …
      </Link>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={8}>
      GitHub
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

### 10.3 Dock — `components/ui/dock.tsx`

Mac-style icon dock with pointer-driven magnification (Motion springs).

```
┌──────────────────────────────────────┐
│  ( ⬡ )  ( ⬡ )  ( ⬡ )  ( ⬡ )        │  ← icons scale toward the pointer
└──────────────────────────────────────┘
     frosted · blurred · rounded-2xl
```

```tsx
import { Dock, DockIcon } from "@/components/ui/dock"

;<Dock direction="middle" iconSize={40} iconMagnification={60}>
  <DockIcon>{/* icon */}</DockIcon>
  <DockIcon>{/* icon */}</DockIcon>
</Dock>
```

`direction`: `top` | `middle` | `bottom` (aligns icons on the cross-axis).

---

### 10.4 Header — `components/nav/header.tsx`

Stub placeholder (`<div>Header</div>`). Reserved for brand / nav. Should eventually use `font-heading` via semantic headings or explicit `font-heading`.

---

### 10.5 Footer — `components/nav/footer.tsx`

Fixed bottom chrome with three zones:

| Zone        | Content                        | Type treatment                                          |
| ----------- | ------------------------------ | ------------------------------------------------------- |
| Copyright   | `© {year} / {APP_NAME}`        | `text-sm text-muted-foreground` + primary semibold name |
| Now playing | “last played — Song by Artist” | same pattern                                            |
| Social      | GitHub, Instagram, X, Email    | `react-icons`, tooltips, hover lift                     |

Env vars:

- `NEXT_PUBLIC_APP_NAME`
- `NEXT_PUBLIC_SOCIAL_USERNAME`

---

### 10.6 Home view — `views/homeView.tsx`

Reference composition for the shared body column: Montserrat title, Geist
prose, a floated portrait at phone/desktop sizes, semantic inline links and
compact glass preview cards. Internal links preview generated OG images rather
than loading their routes. Preview cards keep a fixed aspect ratio, use
`bg-muted` skeletons only before first settlement, and remain clickable to the
destination.

---

## 11. Icons

| Source                      | Where                           | Notes                                         |
| --------------------------- | ------------------------------- | --------------------------------------------- |
| `react-icons` (`fa6`, `ri`) | Footer socials                  | GitHub, Instagram, X, Envelope @ `size={20}`  |
| shadcn `iconLibrary`        | `components.json` → `"lucide"`  | Default for newly generated shadcn components |
| Magic UI registry           | `@magicui` in `components.json` | Optional animated components                  |

**Icon behavior in Button:** default SVG size `size-4` unless overridden; icons are non-interactive (`pointer-events-none`).

**Icon behavior in Dock:** children centered in a `rounded-full` hit target that scales.

**Navigation icon rule:** never use text glyphs such as `←`, `→`, `‹`, or `›`
for navigation. Use `react-icons` caret/chevron components (`PiCaretLeftBold`,
`PiCaretRightBold`) beside an accessible label.

---

## 12. Accessibility

| Area           | Implementation                                                                             |
| -------------- | ------------------------------------------------------------------------------------------ |
| Focus          | Buttons use `focus-visible:ring-3 ring-ring/50`                                            |
| Invalid forms  | `aria-invalid` → destructive ring/border                                                   |
| Theme hotkey   | Ignored when focus is in `input` / `textarea` / `select` / `contentEditable`               |
| Social links   | `aria-label` on each link; tooltips as progressive enhancement                             |
| External links | `rel="noopener noreferrer"` + `target="_blank"`                                            |
| Link cursor    | Every `a[href]` uses `cursor: pointer`; never leave actionable links on the default cursor |
| Tooltips       | Radix primitives (keyboard / focus aware)                                                  |
| Hydration      | `suppressHydrationWarning` on `<html>` for theme class                                     |

---

## 13. Usage recipes

### 13.1 Page section

```tsx
<section className="flex flex-col gap-4">
  <h2 className="text-2xl font-medium">Section title</h2>
  <p className="text-muted-foreground">
    Supporting copy in Geist with quiet color.
  </p>
  <Button>Primary action</Button>
</section>
```

### 13.2 Emphasized inline brand

```tsx
<span className="font-semibold text-primary">
  {process.env.NEXT_PUBLIC_APP_NAME}
</span>
```

### 13.3 Code / keyboard hint

```tsx
<p className="font-mono text-xs text-muted-foreground">
  Press <kbd>d</kbd> to toggle dark mode
</p>
```

### 13.4 Soft surface

```tsx
<div className="rounded-xl border border-border bg-card p-4 text-card-foreground">
  Card content
</div>
```

### 13.5 Widen shell for desktop (recommended pattern)

```tsx
// app/layout.tsx — when ready
<div className="flex min-h-svh w-full max-w-md min-w-0 flex-col p-6 md:max-w-2xl lg:max-w-4xl">
```

### 13.6 Long strings must wrap (tokens, URLs, env lines, mono)

Unbroken strings (API tokens, refresh tokens, env assignments, long URLs, hashes) **must never overflow** their container. This is required on every surface — React UI and standalone HTML helpers.

| Context                           | Required utilities / CSS                                                                         |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Flex/grid children                | `min-w-0` on the shrinking item (and often the parent chain)                                     |
| Inline / block text               | `break-all` or `break-words` + `overflow-wrap`                                                   |
| Prefers hard breaks (tokens, env) | `break-all` + `overflow-wrap-anywhere` (or CSS `overflow-wrap: anywhere; word-break: break-all`) |
| Preserve newlines but wrap        | `whitespace-pre-wrap` **with** break rules above                                                 |
| Containers                        | `max-w-full` / `w-full` + `overflow-x-hidden` if needed                                          |

```tsx
{/* React / Tailwind */}
<pre className="min-w-0 max-w-full overflow-x-hidden whitespace-pre-wrap break-all font-mono text-xs">
  SPOTIFY_REFRESH_TOKEN="…"
</pre>

<p className="min-w-0 break-all font-mono text-sm">{longToken}</p>
```

```css
/* Standalone HTML (same contract) */
.mono-block {
  max-width: 100%;
  min-width: 0;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  overflow-x: hidden;
}
```

**Do not** rely on `white-space: pre-wrap` alone — long tokens still overflow without `break-all` / `overflow-wrap: anywhere`.

---

## 14. Extending the system

### Add a color token

1. Define in `:root` and `.dark` in `app/globals.css`
2. Map in `@theme inline` as `--color-your-token: var(--your-token)`
3. Use as `bg-your-token` / `text-your-token`

### Add a font role

1. Load with `next/font/google` in `app/layout.tsx`
2. Attach `.variable` on `<html>`
3. Register in `@theme` if needed
4. Apply via base layer or utility class

### Add a component

```bash
# shadcn (uses components.json)
npx shadcn@latest add <component>

# Magic UI
npx shadcn@latest add @magicui/<name>
```

Keep variants in CVA; consume tokens only (no hard-coded theme colors).

### Change radius globally

Edit `--radius` in `:root`; the entire `sm`–`4xl` scale recalculates.

---

## 15. Portability & multi-brand — use on any site

> **Goal:** the _same_ system drops into any website by swapping **token values only**. The architecture (token names, roles, scales, component APIs) stays fixed. This is exactly what already ships in daaysorn — this section just formalizes the contract so it travels.

### 15.1 Three-tier token model

The system is layered so branding changes never touch component code.

| Tier             | What it is                                                                                          | Where it lives                                    | Swappable?                      |
| ---------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------- |
| **1. Primitive** | Raw values (an OKLCH color, a rem size, a font family)                                              | `:root` / `.dark` / `@theme` in `app/globals.css` | ✅ Per brand                    |
| **2. Semantic**  | Role names that map to primitives (`--primary`, `--muted-foreground`, `--font-heading`, `--radius`) | `@theme inline` mapping in `app/globals.css`      | ⚠️ Rename rarely                |
| **3. Component** | Utilities/variants consuming semantics (`bg-primary`, CVA button variants)                          | `components/`**                                   | ❌ Do not hard-code values here |

**Rule:** components only ever read **tier 2** (semantic). They must never contain a raw hex/oklch/px color. That single discipline is what makes the system portable.

### 15.2 Fixed vs swappable (the contract)

| Layer       | Fixed (the “system”)                                                                                                                                                  | Swappable (the “brand”)                             |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Color       | Semantic role names (`background`, `foreground`, `primary`, `muted`, `accent`, `destructive`, `border`, `input`, `ring`, `card`, `popover`, `sidebar*`, `chart-1..5`) | Their OKLCH values in `:root` / `.dark`             |
| Type        | Role variables (`--font-sans`, `--font-heading`, `--font-mono`) + base-layer mapping (`h*`→heading, `code`→mono)                                                      | The actual font families loaded in `app/layout.tsx` |
| Radius      | Derivation scale (`sm`–`4xl` from `--radius`)                                                                                                                         | The `--radius` base value                           |
| Breakpoints | The named ladder (`watch`, `xs`, `sm`–`2xl`)                                                                                                                          | The rem values per name                             |
| Components  | Public APIs (Button variants/sizes, Tooltip parts, Dock props)                                                                                                        | Which variants a brand uses                         |
| Motion      | Interaction rules (focus ring, press, hover lift)                                                                                                                     | Timing/easing values                                |

If you only change the **right column**, any site looks on-brand while behaving identically.

### 15.3 Port to a new site (checklist)

```
- [ ] Copy app/globals.css (token blocks + @theme) and lib/utils.ts (cn)
- [ ] Copy components/ui + components/theme-provider.tsx
- [ ] In app/layout.tsx: load the new brand's 3 font roles (sans/heading/mono)
- [ ] In :root and .dark: replace OKLCH values only (keep the token NAMES)
- [ ] Set --radius to the brand's roundness
- [ ] Adjust --breakpoint-* rem values only if the brand needs it
- [ ] Verify contrast (see 15.5) and focus visibility
- [ ] Do NOT rename semantic tokens or hard-code values in components
```

### 15.4 Brand-swap mechanics (Tailwind v4)

A brand is just a values file. Keep names identical; change values.

```css
/* brand-acme.css — swap in per site, names never change */
:root {
  --background: oklch(0.99 0.01 95);
  --foreground: oklch(0.2 0.02 260);
  --primary: oklch(0.55 0.2 265); /* brand hue */
  --primary-foreground: oklch(0.98 0 0);
  --radius: 0.375rem; /* tighter brand */
  /* …rest of the SAME token names… */
}
.dark {
  /* same names, dark values */
}
```

Because `@theme inline` maps `--color-*` → these variables, **every** `bg-primary` / `text-muted-foreground` across the app re-skins with zero component edits. Multi-brand = load a different values file (or a `[data-brand="acme"]` scope).

### 15.5 Accessibility as part of the contract

Portability must not break a11y. Any brand swap must still pass:

| Check                             | Target                              |
| --------------------------------- | ----------------------------------- |
| Body text vs background           | ≥ 4.5:1 contrast                    |
| Large text / UI vs background     | ≥ 3:1                               |
| `primary-foreground` on `primary` | ≥ 4.5:1                             |
| `destructive` legibility          | ≥ 4.5:1 in both themes              |
| Focus ring visibility             | `ring-ring` visible on all surfaces |
| Not color-only meaning            | Pair with icon/label                |

### 15.6 Versioning the contract

Treat the token/API surface like an API:

- **Patch** — value tweaks (recolor, radius nudge) → no code changes needed.
- **Minor** — add a new semantic token or component variant (backwards compatible).
- **Major** — rename/remove a semantic token or change a component API → update consumers + changelog.

Record every change in the [Changelog](#changelog-design-system-doc).

### 15.7 Full theme replacement (shadcn Create → this repo)

Someone adopting daaysorn (or rebranding it) can throw away the current look entirely:

1. Open [shadcn/ui Create](https://ui.shadcn.com/create) and pick a new style / base color / radius.
2. Copy the generated CSS variable blocks into `app/globals.css` (replace `:root` and `.dark` values — keep names).
3. Keep (or re-apply) daaysorn-specific layers you still need: font variables in `layout.tsx`, `--breakpoint-watch` / `--breakpoint-xs`, base `h*` / `code` rules.
4. Leave `components/ui` alone — they already bind to the semantic contract.
5. Optionally align `components.json` (`style`, `baseColor`) with what you generated so future `shadcn add` stays consistent.

Result: a completely different brand, same design-system architecture, same shadcn workflow.

---

## 16. Agent usage (skill)

This design system is exposed to AI coding agents as a **project skill** so any agent building UI in this repo follows it automatically.

| Item                    | Value                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Skill (edit here)**   | https://github.com/daaysorn/daaysorn/blob/main/public/doc/daaysorn-design-system/SKILL.md · local `public/doc/daaysorn-design-system/SKILL.md` |
| Skill name              | `daaysorn-design-system`                                                                                                                       |
| Deep reference          | this file · https://github.com/daaysorn/daaysorn/blob/main/public/doc/designSystem.md                                                          |
| Runtime source of truth | `app/globals.css`                                                                                                                              |

### 16.1 How to invoke

- **Humans:** ask the agent to _“use the daaysorn-design-system skill”_ (or mention design system / tokens / breakpoints / theming), then describe the UI.
- **Agents:** read `public/doc/daaysorn-design-system/SKILL.md` (GitHub: https://github.com/daaysorn/daaysorn/blob/main/public/doc/daaysorn-design-system/SKILL.md), then consult the relevant section of this doc via progressive disclosure before writing UI code.

### 16.2 What the skill enforces (summary)

The skill carries the non-negotiable rules (tokens-only, font roles, breakpoint ladder incl. `xs`/`watch`, radius scale, `cn()` usage, component APIs) plus a pre/post build checklist. This doc remains the deep reference the skill links into.

Actionable links always use the pointer cursor. `app/globals.css` owns the
runtime default through `a[href] { cursor: pointer; }`, so this behavior remains
consistent across body links, cards, navigation, previews, and social links.

---

## Quick reference card

| Need                     | Use                                                                 |
| ------------------------ | ------------------------------------------------------------------- |
| Page background          | `bg-background`                                                     |
| Body text                | `text-foreground` (default)                                         |
| Quiet text               | `text-muted-foreground`                                             |
| Quiet fill / skeleton    | `bg-muted` + `animate-pulse`                                        |
| Ghost action             | `<Button variant="ghost">`                                          |
| Live text shimmer        | `motion-safe:animate-text-shimmer` (~5.5s)                          |
| Live pulse               | `motion-safe:animate-pulse` / `animate-music-pulse`                 |
| Strong / brand text      | `text-primary` + `font-semibold`                                    |
| Heading                  | `<h*>` → Montserrat automatically                                   |
| Body font                | Geist via `font-sans`                                               |
| Code font                | `font-mono` or `<code>` / `<kbd>`                                   |
| Primary CTA              | `<Button>`                                                          |
| Secondary CTA            | `<Button variant="outline">` or `secondary`                         |
| Danger                   | `<Button variant="destructive">`                                    |
| Floating tip             | Tooltip compound components                                         |
| Icon shelf               | `<Dock>` + `<DockIcon>`                                             |
| Toggle theme             | Press `d`                                                           |
| Merge classes            | `cn(...)` from `@/lib/utils`                                        |
| iPhone 12 (~390)         | Base + `xs:` (not `sm:`)                                            |
| Ultra-narrow / watch     | `max-watch:` for simplifications                                    |
| Compact phones           | `xs:` from 360px                                                    |
| Tablet+                  | `md:` / `lg:` / `xl:` / `2xl:` (Tailwind defaults)                  |
| Long tokens / env / URLs | `min-w-0 break-all` (+ `whitespace-pre-wrap` if needed) — see §13.6 |

---

## Changelog (design system doc)

| Date           | Change                                                                                                                                                                                                                                                                                                                               |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Initial        | Full audit of fonts (Geist / Montserrat / JetBrains Mono), OKLCH tokens, radius scale, shell layout, Button / Tooltip / Dock / Footer, theme provider, Tailwind default breakpoints                                                                                                                                                  |
| Breakpoints    | Deep §7: why Tailwind isn’t “wrong,” what we keep vs extend (`watch`/`xs`), how it helps phones (incl. iPhone 12), wearables, shadcn compatibility, anti-patterns                                                                                                                                                                    |
| Portability    | Added §15 (three-tier tokens, fixed-vs-swappable contract, brand-swap mechanics, a11y contract, versioning) + §16 agent skill usage; skill at [https://github.com/daaysorn/daaysorn/blob/main/public/doc/daaysorn-design-system/SKILL.md](https://github.com/daaysorn/daaysorn/blob/main/public/doc/daaysorn-design-system/SKILL.md) |
| shadcn Create  | Documented origin of `globals.css` from [ui.shadcn.com/create](https://ui.shadcn.com/create); §2.1, §9.4, §15.7 — replace theme values freely, keep token names; shadcn `add` works unchanged                                                                                                                                        |
| Overflow wrap  | §13.6 — long tokens/URLs/env lines must use `break-all` + `overflow-wrap` / `min-w-0`; Spotify auth callback fixed                                                                                                                                                                                                                   |
| Feedback UI    | §3.6 muted text hierarchy; §8.7 ghost patterns, skeletons, pulse, text-shimmer (`5.5s ease-in-out`)                                                                                                                                                                                                                                  |
| Performance UI | Added performance as a design principle; §8.1 CSS-only page reveals; §8.8 server/client boundaries, lightweight OG previews, settled skeleton behavior and reduced-motion rules                                                                                                                                                      |
| Page OG        | §8.9 — PageLightSwiss via `createPageOgImage`; **description must stay one line** (≤72 chars, template `nowrap`); `localOpenGraphImageSrc` for automatic previews                                                                                                                                                                     |

---

_When tokens or components change, update this file in the same PR so the design system stays the single source of truth for humans — while_ `app/globals.css` _remains the source of truth for the runtime._
