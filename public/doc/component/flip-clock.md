# Flip Clock

A split-flap **HH:MM:SS** clock. Each digit does the classic flip-clock fold
when it changes — the top flap folds down while the bottom flap folds up. It
reads the time from the **viewer's own timezone** via `Intl` (no geolocation
prompt), so it reflects wherever they are.

---

By default it's styled **muted** (grey, `text-sm`) to sit inline with footer
text like `04 : 52 : 41 - 2026 / Your Name` — restyle freely (see
[Customization](#customization)).

## Install

```bash
# bun
bunx shadcn@latest add https://daaysorn.com/r/flip-clock.json
bunx shadcn@latest add @daaysorn/flip-clock      # if the namespace is configured

# npm
npx shadcn@latest add https://daaysorn.com/r/flip-clock.json
```

This copies:

```
components/custom/flipclock/   flip-clock.tsx, flip-unit.tsx, index.ts
```

CSS injected: the `flip-fold-top` / `flip-fold-bottom` keyframes and the
`animate-flip-top` / `animate-flip-bottom` utilities. No npm dependencies, no
env — it uses your existing `cn()` helper and theme tokens.

---

## Usage

```tsx
import { FlipClock } from "@/components/custom/flipclock"

// Viewer's local time
<FlipClock />

// In a footer line, e.g. "04:52:41 - 2026 / Your Name"
<span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
  <FlipClock /> - {new Date().getFullYear()} / Your Name
</span>

// Pin to a specific timezone
<FlipClock timeZone="Europe/London" />
```

### Props

| Prop | Type | Default | Notes |
|------|------|---------|-------|
| `timeZone` | `string` | viewer's local zone | Any IANA zone, e.g. `"America/New_York"`. |
| `className` | `string` | — | Merged onto the wrapper. Override size/color here. |

---

## Customization

Everything is a copied-in file, so tweak to taste. The most common knobs:

### Size

Two CSS variables on the wrapper drive the unit dimensions; override via
`className` (the digit font comes from the wrapper's `text-*` class):

```tsx
<FlipClock className="text-base [--fc-h:2rem] [--fc-w:1.4rem]" />   // bigger
```

| Variable | Meaning | Default |
|----------|---------|---------|
| `--fc-h` | Height of each flip unit | `1.3rem` |
| `--fc-w` | Width of each flip unit | `0.85rem` |

Defaults are `font-mono text-sm text-muted-foreground` so it reads as quiet,
inline text.

### Color / surface

The digits and card use semantic tokens in `flip-unit.tsx` — change them there
or override on the wrapper:

```tsx
<FlipClock className="text-foreground" />          // brighter digits
```

- Card surface: `bg-muted` on the unit and each half (change to `bg-card`,
  `bg-primary/10`, etc.).
- Hinge line: `bg-background/50` (the center seam).

### Flip speed

The fold timing lives in your `globals.css` (injected on install). Each flap is
`0.28s`, with the bottom flap delayed by `0.28s` so they hand off at the hinge:

```css
@utility animate-flip-top    { animation: flip-fold-top 0.28s ease-in forwards; }
@utility animate-flip-bottom { animation: flip-fold-bottom 0.28s ease-out 0.28s forwards; }
```

Speed both up/down together, and keep the total under 1s so a seconds rollover
finishes before the next tick. If you change the total, also update `FLIP_MS` at
the top of `flip-unit.tsx` (it must match).

### Reduced motion

The flip runs regardless of `prefers-reduced-motion`. To suppress it, gate the
two classes in `flip-unit.tsx` behind `motion-safe:`
(`motion-safe:animate-flip-top`, `motion-safe:animate-flip-bottom`).

### Format

It renders `HH:MM:SS` (24-hour). For 12-hour, change `hourCycle: "h23"` to
`"h12"` in `flip-clock.tsx`. To drop seconds, remove the last `<Pair>` +
`<Separator>`.

---

## How it works

- `flip-clock.tsx` polls the time every 250ms (so a second rollover flips
  promptly without drift) using
  `Intl.DateTimeFormat(..., { hourCycle: "h23" })` and renders six
  `<FlipUnit>` digits with `:` separators.
- `flip-unit.tsx` tracks `current` / `previous`; on change it renders folding
  flap layers keyed to the CSS animation, then settles. Each half is a clipping
  window onto a full-height glyph (top half shows the upper portion, bottom half
  the lower), which is what produces the split-flap look.
- **Hydration-safe**: it renders a skeleton on the server and swaps to the real
  time after mount, so server/client clocks never mismatch.
- **Accessibility**: the wrapper is `role="timer"` with an `aria-label` of the
  current time; the visual digits are `aria-hidden` to avoid per-digit
  announcements.
- Uses a monospace font for stable digit widths — it inherits `font-mono` from
  your theme.
