# Daaysorn Components — Install Guide

A small **shadcn-compatible registry**. Components are distributed the same way
shadcn/ui components are: the CLI copies the source files into *your* project,
installs dependencies, and patches your `globals.css` / env — so you own the
code and can edit it freely.

| | |
|--|--|
| **Registry index** | `https://daaysorn.com/r/registry.json` |
| **Items** | [`spotify-now-playing`](./spotify-now-playing.md) · [`flip-clock`](./flip-clock.md) |
| **Requires** | Tailwind **v4**, React 19, a shadcn-initialized project (`components.json`) |
| **Maintainer?** | See the [Author Guide](./AUTHOR.md) — how the registry works + how to add components |

> Replace `daaysorn.com` with wherever you host the registry. While developing
> locally it's served from your dev server at `http://localhost:3000/r/...`.

---

## Prerequisites

Your project must be shadcn-initialized (have a `components.json`). If not:

```bash
# bun
bunx shadcn@latest init
# npm
npx shadcn@latest init
```

You also need **Tailwind CSS v4** — these components ship CSS via `@utility` /
`@keyframes` blocks that the CLI injects into your `globals.css`.

---

## Installing a component

### Option 1 — by full URL (works anywhere, no setup)

```bash
# bun
bunx shadcn@latest add https://daaysorn.com/r/spotify-now-playing.json
bunx shadcn@latest add https://daaysorn.com/r/flip-clock.json

# npm
npx shadcn@latest add https://daaysorn.com/r/spotify-now-playing.json
```

### Option 2 — by namespace (nicer, one-time setup)

Add the registry to your `components.json`:

```jsonc
{
  "registries": {
    "@daaysorn": "https://daaysorn.com/r/{name}.json"
  }
}
```

Then:

```bash
bunx shadcn@latest add @daaysorn/spotify-now-playing
bunx shadcn@latest add @daaysorn/flip-clock
```

### What the CLI does on `add`

1. **Copies files** into your project, preserving paths:
   `components/custom/…`, `components/ui/…`, `lib/…`, and (for Spotify) the
   `app/api/…` route handlers.
2. **Installs npm dependencies** (e.g. `swr`, `react-icons`, `radix-ui`).
3. **Injects CSS** — the `@keyframes` / `@utility` animations and any theme
   tokens (`cssVars`) go into your `globals.css`.
4. **Lists env vars** you need to set (Spotify only).

---

## Customizing

Because the files are copied into *your* repo, you customize by editing them —
there's no config to fight. Each component's page documents its specific knobs:

- **[Spotify Now Playing](./spotify-now-playing.md#customization)** — polling
  speed, brand colors, shimmer/pulse, truncation width.
- **[Flip Clock](./flip-clock.md#customization)** — size (`--fc-h` / `--fc-w`),
  color, timezone, animation speed.

General patterns that apply to both:

| Want to change | Where |
|----------------|-------|
| Colors / tone | Semantic classes (`text-muted-foreground`, `bg-muted`, …) in the component, or the theme tokens in `globals.css`. |
| Animation timing | The `@utility animate-*` blocks in `globals.css`. |
| Size / spacing | Tailwind classes on the component's root, or its CSS variables. |
| Behavior | Props (see each component page) and the small consts at the top of each file. |

Everything uses **semantic tokens**, so components auto-adapt to your light/dark
theme and rebrand — no per-color overrides needed.

---

## After installing

- **`spotify-now-playing`** needs Spotify credentials + a one-time refresh
  token. Follow [its guide](./spotify-now-playing.md#setup).
- **`flip-clock`** works with **zero config** — drop `<FlipClock />` anywhere.

---

## Maintaining the registry (for the author)

The source of truth is [`registry.json`](../../../registry.json) at the repo
root — it also serves as the registry **index**. It lists each item and the
files it ships.

### Why you must rebuild

The published files in `public/r/*.json` contain an **inlined snapshot** of each
component's source at build time. So when you edit a component, that JSON is
**stale** until you regenerate it — consumers would otherwise `add` the old code.
Regenerate with:

```bash
bun run registry        # → runs "shadcn build"
```

### It's automatic on every build

The build script runs the registry build first, so a normal deploy always ships
fresh registry JSON — you don't have to remember:

```jsonc
// package.json
{
  "scripts": {
    "registry": "shadcn build",
    "build": "shadcn build && next build"
  }
}
```

```bash
bun run build           # regenerates public/r/*.json, then builds Next.js
```

Since `shadcn` is a local dependency, the scripts call its bin directly — no
`npx`/`bunx` needed inside the scripts. On your host (e.g. Vercel with bun
detected) `bun run build` runs automatically, keeping the published registry in
sync with each deploy.

### Versioning (optional)

Registry URLs aren't versioned by default. If you later need to change a
component without breaking existing installs, publish under a versioned path
(e.g. serve `public/r/v1/…` and point new consumers at `/r/v2/…`), and/or keep a
`version` field on each item. Not required for a personal registry.
