# Author Guide — the Daaysorn component registry

> This is **for you (the maintainer)**, not for people installing your
> components. Consumer-facing docs live in
> [`componentInstall.md`](./componentInstall.md) and the per-component pages.

It explains the mental model, where everything lives, and the exact steps to
**add**, **update**, and **ship** a component. If you only read one section, read
[Add a new component](#add-a-new-component).

---

## Mental model

You are running a **shadcn-compatible registry**. It is *not* an npm package.
Instead of `import`-ing from a library, people run `shadcn add <url>` and the CLI
**copies your source files into their project**, installs the npm deps, and
patches their `globals.css` + env. They own the code afterwards.

This "copy-in" model is why the feature can span a **component + API route + CSS
+ env + deps** — things a plain package can't install for someone.

The flow:

```
registry.json         ← you edit this (source of truth: which files ship)
      │  bun run registry  (= "shadcn build")
      ▼
public/r/*.json       ← generated; each file's source is INLINED as a snapshot
      │  deploy
      ▼
https://daaysorn.com/r/<name>.json   ← what `shadcn add` fetches
```

**The one rule that bites people:** `public/r/*.json` is a *snapshot*. If you
edit a component and don't rebuild, the published JSON is stale and consumers get
old code. The build script does this automatically (see [Build](#build--deploy)).

---

## Repo map

| Path | What it is |
|------|-----------|
| `registry.json` | **Source of truth.** Lists each item and the files it ships, plus deps / cssVars / css / envVars. Edit this to change what's published. |
| `public/r/*.json` | **Generated** by `shadcn build`. One file per item + `registry.json` (the index). Committed & deployed; don't hand-edit. |
| `components/daaysorn-cmp/<feature>/` | **Self-contained** component source. Everything it needs lives here: client components, its own `ui/` primitives, `server.ts`, `auth.ts`, `types.ts`. |
| `app/api/**` | Thin route-handler **shims** — Next.js requires route files under `app/`, so these are one-liners that re-export logic from the feature folder. |
| `components/ui/*`, `lib/utils.ts` | Pre-existing app scaffolding (button, tooltip, `cn`). Not shipped by components — consumers already have `cn` from shadcn init. |
| `app/globals.css` | Where `@utility` / `@keyframes` / theme tokens live in *this* app. The registry re-injects equivalents on install via the item's `css` / `cssVars`. |
| `components.json` | shadcn config. Its `registries` map lets `@daaysorn/<name>` resolve to your URL. |
| `public/doc/component/*` | These docs. |

---

## How one registry item is described

Each entry in `registry.json` → one installable component. Anatomy:

```jsonc
{
  "name": "flip-clock",              // → /r/flip-clock.json, and @daaysorn/flip-clock
  "type": "registry:block",          // a multi-file feature
  "title": "Flip Clock",
  "description": "...",
  "dependencies": ["swr"],           // npm packages the CLI installs
  "registryDependencies": [],        // OTHER registry items to pull first (bare = shadcn's)
  "files": [
    // Ship everything inside the feature folder as registry:component
    { "path": "components/daaysorn-cmp/spotify/now-playing.tsx", "type": "registry:component" },
    { "path": "components/daaysorn-cmp/spotify/server.ts",       "type": "registry:component" },
    { "path": "components/daaysorn-cmp/spotify/ui/dialog.tsx",   "type": "registry:component" },
    // Route handlers must live under app/ → thin shim with an exact target
    { "path": "app/api/now-playing/route.ts", "type": "registry:file",
      "target": "app/api/now-playing/route.ts" }
  ],
  "cssVars": { "light": { "shimmer-glint": "..." }, "dark": { "...": "..." } },
  "css": { "@keyframes ...": { ... }, "@utility ...": { ... } },
  "envVars": { "SPOTIFY_CLIENT_ID": "" }
}
```

### `files[].type` — where each file lands

| type | Destination | Use for |
|------|-------------|---------|
| `registry:component` | components alias (path preserved, e.g. `components/daaysorn-cmp/…`) | **Everything in the feature folder** — components, its `ui/*`, `server.ts`, `auth.ts`, types |
| `registry:ui` | ui alias (`components/ui/…`) | shadcn default for primitives — **we don't use it** (see convention below) |
| `registry:lib` | lib alias (`lib/…`) | shadcn default for helpers — **we don't use it** (helpers go in the folder) |
| `registry:hook` | hooks alias | Hooks (if ever shared app-wide) |
| `registry:file` | **exact `target`** (required) | Anything that must sit outside the folder — API route shims, config |

> **Self-contained convention.** Everything a component needs is shipped as
> `registry:component` files **inside its own folder** — including its `ui/`
> primitives (`components/daaysorn-cmp/<feature>/ui/*`) and any `server.ts` /
> `auth.ts`. This keeps installs from touching the consumer's `components/ui/`
> or `lib/`, and avoids clobbering their existing shadcn primitives. Use
> **relative imports** within the folder (`./ui/dialog`, `./server`) so the
> whole directory is portable.
>
> Two consequences:
> - Don't `registryDependencies: ["dialog"]` for primitives you've customized —
>   that would pull shadcn's *official* version. Ship your own copy in the folder.
> - Route handlers can't live in the folder (Next.js needs them under `app/`), so
>   ship them as `registry:file` **shims** with a `target`, and put their real
>   logic in the folder (`server.ts` / `auth.ts`).

### `css` / `cssVars` / `envVars`

- **`css`** — arbitrary CSS as nested JSON (`@keyframes`, `@utility`, `@layer`).
  The CLI appends it to the consumer's `globals.css`. This is how animations
  travel with the component.
- **`cssVars`** — theme tokens written under `:root` / `.dark` (keys **without**
  the `--` prefix).
- **`envVars`** — listed to the user after install (e.g. Spotify keys).

Keep these **in sync** with what's actually in this app's `app/globals.css`. They
are two copies of the same thing: `globals.css` powers *this* site; the `css`
field powers *installs*.

---

## Add a new component

End-to-end checklist. Say you're adding `foo-widget`.

1. **Build it in the app** under `components/daaysorn-cmp/foo/`. Use semantic tokens
   only (see the design-system skill), `cn()` for classes, and put any
   keyframes/utilities in `app/globals.css`. Wire it somewhere (e.g. the footer)
   and get it working + typechecking.
2. **List its pieces.** Note every file it needs: components, ui primitives, lib
   helpers, API routes, the css blocks, css vars, env vars, npm deps.
3. **Add an item to `registry.json`** following the anatomy above. Match
   `files[].type` to the table; use `registry:file` + `target` for anything
   outside an alias. Copy the css/cssVars from `globals.css` into the item's
   `css`/`cssVars`.
4. **Rebuild:** `bun run registry`. Confirm `public/r/foo-widget.json` appears
   and that `files[].content` is populated.
5. **Smoke test the install** against your dev server in a throwaway project:
   ```bash
   bunx shadcn@latest add http://localhost:3000/r/foo-widget.json
   ```
   Check files land in the right places, deps install, css is injected.
6. **Write the doc**: `public/doc/component/foo-widget.md` (usage, props, setup,
   customization) and add it to the items list in `componentInstall.md`.
7. **Commit** `registry.json`, `public/r/*`, the component files, and docs.
8. **Deploy.** Now `https://daaysorn.com/r/foo-widget.json` is live and
   `@daaysorn/foo-widget` resolves.

---

## Update an existing component

1. Edit the files under `components/…` / `lib/…` / `app/…` as normal.
2. **Rebuild the registry** so the snapshot refreshes:
   ```bash
   bun run registry
   ```
   (Or just `bun run build` — it rebuilds the registry first. If you forget,
   deploy does it too.)
3. Commit the changed source **and** the regenerated `public/r/*.json`, then
   deploy.

Existing installs are copies in other people's repos — they won't auto-update.
`shadcn add` again pulls the new version (and will prompt before overwriting).

---

## Build & deploy

`package.json`:

```jsonc
{
  "scripts": {
    "registry": "shadcn build",           // regenerate public/r/*.json
    "build": "shadcn build && next build"  // registry is always fresh on build
  }
}
```

- `shadcn` is a **local dependency**, so the scripts call its bin directly — no
  `npx`/`bunx` needed *inside* the scripts.
- `bun run build` regenerates the registry, then builds Next.js. On Vercel (bun
  detected from `bun.lock`) this runs on every deploy, so the published registry
  is always in sync with `main`.
- The JSON files are static assets in `public/`, so `https://daaysorn.com/r/x.json`
  just works once deployed. **They only go live after you deploy** — locally
  they're at `http://localhost:3000/r/x.json`.

---

## Per-component operational notes

### spotify-now-playing
- Needs `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` / `SPOTIFY_REFRESH_TOKEN`
  in env (server-only). Mint the refresh token **once** via
  `/api/spotify-auth/login` → the callback shows it. Those helper routes are
  dev-only (403 in prod) and can be deleted after.
- Live data is **Spotify-only** (Apple/YouTube have no simple now-playing API);
  the multi-provider embed code is for manually-pinned tracks.
- Full setup: [spotify-now-playing.md](./spotify-now-playing.md).

### flip-clock
- Zero-config. Reads the viewer's timezone via `Intl` (no geolocation prompt).
- `FLIP_MS` in `flip-unit.tsx` **must match** the total CSS flip duration in
  `globals.css` (top flap + delayed bottom flap). Change one, change the other.
- Full options: [flip-clock.md](./flip-clock.md#customization).

---

## Rules & gotchas

- **Rebuild after every edit** to a shipped file, or `public/r/*.json` is stale.
  The build script covers you; manual edits between deploys don't.
- **Tailwind v4 only.** The `css` payloads use v4 `@utility` / `@theme` syntax.
- **Semantic tokens only** in components (no raw hex) so installs adapt to any
  theme. See the `daaysorn-design-system` skill.
- **Keep components self-contained.** Ship primitives, server logic, and helpers
  as `registry:component` files **inside the feature folder** (with relative
  imports), not to `components/ui/` or `lib/`. Route handlers are the only
  exception — thin `registry:file` shims under `app/`.
- **Update the host URL.** Docs + `components.json` reference
  `https://daaysorn.com` — that's your domain; keep it correct if it ever moves.
- **Versioning is optional.** Registry URLs aren't versioned. If you need
  non-breaking updates later, serve `public/r/v2/…` and point new consumers
  there; add a `version` field per item.

---

## Command cheat sheet

```bash
bun run dev             # develop
bun run registry        # regenerate public/r/*.json after editing a component
bun run build           # registry + next build (what deploy runs)
bun run typecheck       # tsc --noEmit

# test an install against your dev server (in a scratch project)
bunx shadcn@latest add http://localhost:3000/r/<name>.json
```
