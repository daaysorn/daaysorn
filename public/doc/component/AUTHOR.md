# Author Guide — the daaysorn component registry

> This is **for you (the maintainer)**, not for people installing your
> components. Consumer-facing docs live in
> [`componentInstall.md`](./componentInstall.md) and the per-component pages.

It explains the mental model, where everything lives, and the exact steps to
**add**, **update**, and **ship** a component. If you only read one section, read
[Add a new component](#add-a-new-component).

---

## Mental model

You are running a **shadcn-compatible registry**. It is _not_ an npm package.
Instead of `import`-ing from a library, people run `shadcn add <url>` and the CLI
**copies your source files into their project**, installs the npm deps, and
patches their `globals.css` + env. They own the code afterwards.

This "copy-in" model is why the feature can span a **component + API route + CSS

- env + deps** — things a plain package can't install for someone.

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

**The one rule that bites people:** `public/r/*.json` is a _snapshot_. If you
edit a component and don't rebuild, the published JSON is stale and consumers get
old code. The build script does this automatically (see [Build](#build--deploy)).

---

## Repo map

| Path                                 | What it is                                                                                                                                            |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `registry.json`                      | **Source of truth.** Lists each item and the files it ships, plus deps / cssVars / css / envVars. Edit this to change what's published.               |
| `public/r/*.json`                    | **Generated** by `shadcn build`. One file per item + `registry.json` (the index). Committed & deployed; don't hand-edit.                              |
| `components/daaysorn-cmp/<feature>/` | **Self-contained** component source. Everything it needs lives here: client components, its own `ui/` primitives, `server.ts`, `auth.ts`, `types.ts`. |
| `app/api/**`                         | Thin route-handler **shims** — Next.js requires route files under `app/`, so these are one-liners that re-export logic from the feature folder.       |
| `components/ui/*`, `lib/utils.ts`    | Pre-existing app scaffolding (button, tooltip, `cn`). Not shipped by components — consumers already have `cn` from shadcn init.                       |
| `app/globals.css`                    | Where `@utility` / `@keyframes` / theme tokens live in _this_ app. The registry re-injects equivalents on install via the item's `css` / `cssVars`.   |
| `components.json`                    | shadcn config. Its `registries` map lets `@daaysorn/<name>` resolve to your URL.                                                                      |
| `public/doc/component/*`             | These docs.                                                                                                                                           |

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

| type                 | Destination                                                         | Use for                                                                                      |
| -------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `registry:component` | components alias (path preserved, e.g. `components/daaysorn-cmp/…`) | **Everything in the feature folder** — components, its `ui/*`, `server.ts`, `auth.ts`, types |
| `registry:ui`        | ui alias (`components/ui/…`)                                        | shadcn default for primitives — **we don't use it** (see convention below)                   |
| `registry:lib`       | lib alias (`lib/…`)                                                 | shadcn default for helpers — **we don't use it** (helpers go in the folder)                  |
| `registry:hook`      | hooks alias                                                         | Hooks (if ever shared app-wide)                                                              |
| `registry:file`      | **exact `target`** (required)                                       | Anything that must sit outside the folder — API route shims, config                          |

> **Self-contained convention.** Everything a component needs is shipped as
> `registry:component` files **inside its own folder** — including its `ui/`
> primitives (`components/daaysorn-cmp/<feature>/ui/*`) and any `server.ts` /
> `auth.ts`. This keeps installs from touching the consumer's `components/ui/`
> or `lib/`, and avoids clobbering their existing shadcn primitives. Use
> **relative imports** within the folder (`./ui/dialog`, `./server`) so the
> whole directory is portable.
>
> Two consequences:
>
> - Don't `registryDependencies: ["dialog"]` for primitives you've customized —
>   that would pull shadcn's _official_ version. Ship your own copy in the folder.
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
are two copies of the same thing: `globals.css` powers _this_ site; the `css`
field powers _installs_.

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
    "registry": "shadcn build", // regenerate public/r/*.json
    "build": "shadcn build && next build", // registry is always fresh on build
  },
}
```

- `shadcn` is a **local dependency**, so the scripts call its bin directly — no
  `npx`/`bunx` needed _inside_ the scripts.
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
- The access token is reused in warm server instances. `/api/now-playing` is
  shared at Vercel's edge for ten seconds; clients check every fifteen seconds
  while playing and every sixty seconds while idle. Do not restore per-visitor
  five-second, no-store polling.
- Full setup: [spotify-now-playing.md](./spotify-now-playing.md).

### flip-clock

- Zero-config. Reads the viewer's timezone via `Intl` (no geolocation prompt).
- `FLIP_MS` in `flip-unit.tsx` **must match** the total CSS flip duration in
  `globals.css` (top flap + delayed bottom flap). Change one, change the other.
- Full options: [flip-clock.md](./flip-clock.md#customization).

### Keeps publishing pipeline

Keeps is Tomiwa's public collection of useful posts, articles, videos, and
ideas. It is not a product for visitors to save their own links. Telegram is the
private publishing input; `/keeps` is the public reading surface.

Visitors can bookmark Tomiwa's Keeps with the save icon. The selected Keep IDs
live only in `localStorage` under `daaysorn-keeps-favourites`; no visitor data is
written to Postgres until the visitor chooses **Export to other devices**.
**Saved Keeps** switches the collection to the visitor's saved items. Exporting
creates an anonymous private sync group in Postgres and a URL-fragment link that
contains its access key. Opening the link joins another device to that group.
Never log or move that fragment into a query string because it is the private
credential for the collection.

Every device keeps its local copy and an offline mutation queue. Saves and
removals work without a connection, then PATCH `/api/keeps/sync` when the device
reconnects. Online devices subscribe to a private, collection-scoped Ably
channel and reconcile from Neon immediately when another device changes the
collection. A fifteen-minute refresh plus focus/reconnect refresh remains as a
durability fallback. Offline devices cannot receive remote events, but they
apply local changes immediately and flush them as soon as connectivity returns.
The last change received for the same Keep wins; changes to different Keeps are
merged independently.

Telegram additions, edits, and deletions publish a lightweight `changed` event
to the subscribe-only `public:keeps` Ably channel. Connected readers immediately
fetch a fresh, query-keyed `/api/keeps` response. The public feed still refreshes
every ten minutes, on focus, and on reconnect as a durability fallback. Normal
responses are cached at the edge for one minute and can be served stale while
they refresh for ten minutes. Do not restore the old two-second SSE database
polling: every reader held a function open and repeatedly queried Postgres,
which is unsuitable for the Vercel free plan.

#### Keeps analytics

Keeps interaction events use `sendGAEvent` from `@next/third-parties/google`
through `lib/analytics.ts`. Google Analytics is initialized once in the root
layout. Events intentionally exclude search text, original URLs, local-storage
contents, sync-group IDs, sync secrets, and export links.

| Event                  | What it measures                                       |
| ---------------------- | ------------------------------------------------------ |
| `keeps_view`           | Collection visits and available Keep count             |
| `keep_impression`      | A Keep becoming at least 50% visible                   |
| `keep_open`            | Opening the original content                           |
| `keep_favourite`       | Saving or removing a favourite                         |
| `keep_share`           | Native, copied, or social sharing                      |
| `keeps_search`         | Search length bucket and result count, never the query |
| `keeps_filter`         | All, Saved Keeps, Latest, or topic filter use          |
| `keep_preview_error`   | Preview-image failures by source                       |
| `keeps_export_created` | First creation of a private sync collection            |
| `keeps_export`         | Export method and success/failure                      |
| `keeps_device_join`    | A second device joining through an export link         |
| `keeps_sync`           | Change count and sync success/failure                  |
| `keeps_realtime`       | Ably connection status and live updates received       |

##### Set up Keeps reporting in GA4

The site code already sends the events. Complete these steps in the Google
Analytics property after deploying the latest site.

1. Open `https://daaysorn.com/keeps` and trigger representative interactions:
   view the collection, open a Keep, save and remove one, search, select filters,
   share, and test the device export.
2. In GA4, open **Reports → Realtime**.
3. In **Event count by Event name**, confirm the Keeps event names from the table
   above appear. Realtime is the quickest collection check.

Create the reporting fields next:

1. Go to **Admin → Data display → Custom definitions**.
2. Open **Custom dimensions** and select **Create custom dimension**.
3. Create every row below with **Event** scope. The event parameter must match
   the code exactly.

| Dimension name   | Event parameter  |
| ---------------- | ---------------- |
| Keeps feature    | `feature`        |
| Keep name        | `content_name`   |
| Keep source      | `content_source` |
| Favourite action | `action`         |
| Share method     | `method`         |
| Keeps filter     | `filter_name`    |
| Filter type      | `filter_type`    |
| Event outcome    | `outcome`        |
| Search length    | `query_length`   |
| Open location    | `location`       |
| Has preview      | `has_preview`    |
| Sync enabled     | `sync_enabled`   |

Do not register `content_id` as a custom dimension. It is a unique Keep ID and
would create unnecessary high-cardinality reporting.

Then open **Custom metrics → Create custom metric** and create the rows below.
Use **Standard** as the unit of measurement.

| Metric name                | Event parameter     |
| -------------------------- | ------------------- |
| Available Keeps            | `keep_count`        |
| Saved Keeps count          | `saved_count`       |
| Search results             | `result_count`      |
| Synced changes             | `changes_count`     |
| Local Keeps before joining | `local_saved_count` |

Custom definitions normally need 24–48 hours of newly collected data before
they become available throughout reporting and Explorations.

##### Build the Keeps Explorations

Go to **Explore → Free form** and create an exploration named
**Keeps overview**:

- Dimensions: **Event name**, **Keep name**, **Keep source**,
  **Favourite action**, and **Share method**.
- Metrics: **Event count**, **Total users**, and **Saved Keeps count**.
- Rows: **Keep name**.
- Columns: **Event name**.
- Values: **Event count** and **Total users**.
- Filter: **Keeps feature** exactly matches `keeps`.

Add these focused tabs to the same exploration:

1. **Source performance**
   - Rows: **Keep source**.
   - Columns: **Event name**.
   - Values: **Event count** and **Total users**.
   - Filter to `keep_impression`, `keep_open`, `keep_favourite`, and
     `keep_share`.
2. **Saved Keeps**
   - Rows: **Keep name** and **Favourite action**.
   - Values: **Event count** and **Total users**.
   - Filter: **Event name** exactly matches `keep_favourite`.
   - The `action` dimension separates `save` from `remove`.
3. **Search quality**
   - Rows: **Search length**.
   - Values: **Event count** and **Search results**.
   - Filter: **Event name** exactly matches `keeps_search`.
   - Search text is never collected; only the `2_4`, `5_9`, or `10_plus`
     length bucket and result count are available.
4. **Export and sync**
   - Rows: **Event name** and **Event outcome**.
   - Values: **Event count**, **Total users**, and **Synced changes**.
   - Filter to `keeps_export_created`, `keeps_export`,
     `keeps_device_join`, and `keeps_sync`.

Finally, create a **Funnel exploration** with these ordered steps:

1. `keep_impression`
2. `keep_open`
3. `keep_favourite`

Use an open funnel. It shows the percentage of visible Keeps that are opened
and the percentage of opened Keeps that are saved.

Official references:

- [Create event-scoped custom dimensions](https://support.google.com/analytics/answer/14239696?hl=en)
- [Create custom metrics](https://support.google.com/analytics/answer/14239619?hl=en)
- [Build a free-form exploration](https://support.google.com/analytics/answer/9327972?hl=en)

The complete flow is:

```text
Tomiwa shares a link with the Telegram bot
  → Telegram POSTs the update to /api/telegram/keeps
  → the route verifies Telegram's secret and Tomiwa's Telegram user ID
  → the route acknowledges Telegram immediately
  → background processing reads safe public metadata from the link
  → Cencori + gpt-4o-mini creates a structured title, summary, author, and tags
  → PostgreSQL inserts the Keep or refreshes an existing matching URL
  → the webhook publishes changed on Ably's public:keeps channel
  → /api/keeps returns the public fields
  → connected /keeps readers fetch the fresh feed and update immediately
```

Relevant files:

| Path                                           | Purpose                                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| `app/api/telegram/keeps/route.ts`              | Private Telegram webhook and owner verification       |
| `app/api/keeps/route.ts`                       | Read-only public Keeps feed                           |
| `app/api/keeps/sync/route.ts`                  | Anonymous Saved Keeps cross-device synchronization    |
| `app/api/keeps/realtime-token/route.ts`        | Scoped, short-lived Ably subscriber tokens            |
| `app/api/keeps/public-realtime-token/route.ts` | Public-feed, subscribe-only Ably tokens               |
| `lib/keeps/enrich.ts`                          | Safe metadata fetch and Cencori structured summary    |
| `lib/keeps/text.ts`                            | Enforces the two-sentence summary limit               |
| `lib/keeps/db.ts`                              | PostgreSQL schema initialization, reads, and upserts  |
| `lib/keeps/sync-db.ts`                         | Saved Keeps sync groups and per-Keep changes          |
| `lib/keeps/realtime.ts`                        | Ably token creation, private channels, and publishing |
| `database/keeps.sql`                           | Standalone copy of the PostgreSQL schema              |
| `components/keeps/keeps-view.tsx`              | Public list, search, Saved Keeps, export, and sync    |
| `components/keeps/keeps-skeleton.tsx`          | Loading state matching the final layout               |
| `scripts/set-telegram-keeps-webhook.ts`        | Registers the deployed webhook with Telegram          |

#### Environment variables

Keep all credentials server-side. Never put them in `NEXT_PUBLIC_*` variables,
commit them, paste them into documentation, or share them in chat.

```env
DATABASE_URL=
CENCORI_API_KEY=
CENCORI_KEEPS_MODEL=gpt-4o-mini
TELEGRAM_BOT_TOKEN=
TELEGRAM_WEBHOOK_SECRET=
TELEGRAM_OWNER_ID=
ABLY_API_KEY=
```

- `DATABASE_URL` is a PostgreSQL connection string. Neon is the recommended
  host, but another hosted PostgreSQL service can be used.
- `CENCORI_API_KEY` is a server-side `csk_...` project key.
- `CENCORI_KEEPS_MODEL` defaults to `gpt-4o-mini`. It is fast and economical for
  short classification and summarization, and its structured output works
  reliably through Cencori. `gpt-5-mini` currently returns
  `provider_invalid_request` for this schema through Cencori, so do not switch
  back without retesting the exact Keeps request.
- `TELEGRAM_BOT_TOKEN` comes from the verified `@BotFather` account.
- `TELEGRAM_WEBHOOK_SECRET` authenticates webhook requests from Telegram.
- `TELEGRAM_OWNER_ID` restricts publishing to Tomiwa's Telegram account.
- `ABLY_API_KEY` is a server-only Ably key used to publish change notifications
  and mint short-lived, subscribe-only tokens for one Saved Keeps collection.
  Never expose it through a `NEXT_PUBLIC_*` variable.

Add the same production values to Vercel under **Project → Settings →
Environment Variables**, then redeploy. `.env.example` contains blank names only
and is safe to commit. `.env.local` is ignored by Git and stores local values.

#### Enable Ably realtime Saved Keeps

1. Create an Ably account and select the Free package.
2. Create an app named `daaysorn Keeps`.
3. Open the app's **API Keys** area and copy an API key whose capabilities allow
   publish and subscribe. The key stays server-side; browsers never receive it.
4. Add it locally as `ABLY_API_KEY` in `.env.local`.
5. Add the same variable in **Vercel → Project → Settings → Environment
   Variables** for Production, Preview, and Development as needed.
6. Redeploy. Open Saved Keeps on two online devices and export the private link
   from the first device to the second.
7. Save or remove a Keep. The other online device should update immediately.
8. Turn one device offline, make changes, and reconnect. Its queued changes
   should flush immediately and notify the other device through Ably.
9. Keep `/keeps` open in a browser, then add or delete a Keep through Telegram.
   The public list should refresh immediately without reloading the page.

The browser authenticates through `/api/keeps/realtime-token`. That route first
verifies the private Saved Keeps group secret, then returns a six-hour Ably
token restricted to `private:keeps:<group-id>` and `public:keeps`. Visitors who
have not exported Saved Keeps authenticate through
`/api/keeps/public-realtime-token`, which grants subscribe-only access to
`public:keeps`. Publishing remains server-only. If Ably is unavailable, Neon
plus the fallback/focus/reconnect reconciliation keeps both collections
correct.

Realtime deployment checks:

- `/api/keeps/public-realtime-token` returns `200` with a token when the latest
  code and `ABLY_API_KEY` are deployed.
- A `404` means the deployment predates the public realtime route.
- A `503` means `ABLY_API_KEY` is missing from that Vercel environment or the
  project was not redeployed after adding it.
- `/api/keeps/realtime-token` requires a valid private Saved Keeps bearer token,
  so an unauthenticated `401` is expected.

#### Create the Telegram bot

1. Open the verified `@BotFather` account in Telegram.
2. Send `/newbot`.
3. Choose a display name, such as `daaysorn Keeps`.
4. Choose an available username ending in `bot`.
5. Copy the bot token into `TELEGRAM_BOT_TOKEN` in `.env.local`.
6. Treat the token like a password. Regenerate it through BotFather if exposed.

Confirm the token belongs to the expected bot:

```bash
bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/getMe`); console.log(await response.json())'
```

#### Find the Telegram owner ID

Do this before registering the webhook because `getUpdates` cannot be used while
a webhook is active.

1. Open the new bot and tap **Start**.
2. Send `/start`, followed by a fresh message such as `hello keeps`.
3. Run:

```bash
bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/getUpdates`); console.log(JSON.stringify(await response.json(),null,2))'
```

4. Find `result[].message.from.id` and save the number as
   `TELEGRAM_OWNER_ID`.

An empty result is not an error:

```json
{ "ok": true, "result": [] }
```

It means there is no pending message. Send a new direct message to the correct
bot and run the command again. If it remains empty, inspect the bot and webhook:

```bash
# Confirm which bot owns the token
bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/getMe`); console.log(await response.json())'

# Check whether a webhook is already active
bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`); console.log(await response.json())'

# Temporarily remove an existing webhook before using getUpdates
bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`); console.log(await response.json())'
```

#### Generate the webhook secret

Generate a secret containing only characters Telegram accepts:

```bash
openssl rand -hex 32
```

Store the result in `TELEGRAM_WEBHOOK_SECRET`. If it is ever shown publicly,
generate a new value and replace it locally and on Vercel.

#### Connect the deployed webhook

The production deployment must contain `/api/telegram/keeps`, and
`NEXT_PUBLIC_SITE_URL` must be `https://daaysorn.com`.

After adding all environment values to Vercel and redeploying, run:

```bash
bun run telegram:webhook
```

Expected output:

```text
Telegram Keeps webhook set to https://daaysorn.com/api/telegram/keeps
```

Telegram will then send supported updates directly to the deployed API. The
script registers `message`, `edited_message`, and `channel_post` updates and
passes `TELEGRAM_WEBHOOK_SECRET` as Telegram's `secret_token`.

#### Test publishing

1. Send up to five Instagram, X, YouTube, TikTok, or ordinary article links in
   one message directly to the bot. Each unique link is enriched and saved as
   its own Keep.
   Add up to five custom tags as hashtags in the same message when needed:

   ```text
   https://behance.net/example #Branding #Inspiration
   ```

   Use underscores for a multi-word tag, such as `#Product_Design`. Keeps turns
   underscores and hyphens into spaces, preserves owner tags first, then fills
   the remaining tag slots with Cencori suggestions.

   Instagram and TikTok often expose a caption and thumbnail without the spoken
   video transcript. Add a short factual note after the URL when the video needs
   context that is not written in its caption. Keeps treats that note as the
   most trusted source for the title and summary:

   ```text
   https://www.instagram.com/reel/example This demonstrates a tool that turns a long video into short clips. #Creator_Tools
   ```

   Without a note, Cencori must stay within the public caption and clearly avoid
   guessing what happens in the video.

2. A successful background job replies with the number of saved links and lists
   each generated title. If only some links fail, the successful Keeps remain
   saved and the reply includes the failed count.
3. Open `https://daaysorn.com/keeps`.
4. The public feed receives the change through its live event stream. A
   60-second SWR refresh remains as a fallback.

#### Telegram message formats

Send these messages directly to the owner-only bot:

```text
# Save a link
https://example.com/post

# Save a link with up to five custom tags
https://example.com/post #Branding #Product_Design

# Save several links in one message
https://example.com/first
https://example.com/second
https://example.com/third #Research

# Refresh an existing Keep with new tags or metadata
https://example.com/post #Research

# Delete by URL
/delete https://example.com/post
```

To delete without pasting the URL, reply `/delete` to the original Telegram
message. Sending the same canonical URL again updates its existing card instead
of adding a duplicate.

To add or change custom tags on an existing Keep, either edit the original
Telegram message or resend the same link with the new hashtags. Telegram sends
message edits through `edited_message`, and both paths update the existing Keep
because the canonical URL remains the same. Resending is recommended because it
produces a fresh bot confirmation and is easier to troubleshoot.

One Telegram message can create up to five Keeps. The database intentionally
allows those rows to share the same Telegram message ID while continuing to
enforce uniqueness on each canonical URL.

#### Public card and summary rules

- Cencori must return no more than two concise summary sentences. The prompt,
  response handler, and database read layer all enforce this rule, so older
  saved summaries are also limited when displayed.
- The source is identified by its filled platform icon without a source badge.
  The saved creator name is hidden, while the saved date remains visible beside
  the platform.
- Custom topic tags remain available below the summary for searching and
  filtering.
- The share controls and **View** action sit on opposite edges of the same card
  footer row and use the same compact text scale.
- Keep order is randomized once per page visit and remains stable while the
  visitor searches, filters, or receives live updates.
- The **Latest** filter sits immediately after **All** and restores the
  database's newest-first order. **All** returns to the visit's randomized
  discovery order.

#### Supported link types

Keeps accepts any public `http://` or `https://` URL. Enrichment follows a
layered fallback chain so a provider-specific failure does not become a generic
page-shell summary:

1. Dedicated public embed metadata for YouTube, Instagram, and TikTok.
2. A page-advertised JSON oEmbed endpoint when available. This covers many
   video, audio, design, and publishing services without provider-specific
   scraping.
3. Open Graph, X card, standard description, author, and readable HTML text.
4. Direct-file handling for images, video, audio, PDF, JSON, and text files.
5. A deterministic hostname and URL-title fallback when a public server blocks
   metadata access.

YouTube watch, `youtu.be`, Live, Shorts, and embed URLs are normalized to the
same canonical video URL before duplicate checking. Recognized platform labels
and icons include YouTube, Instagram, TikTok, X, Behance, Dribbble, Facebook,
GitHub, LinkedIn, Reddit, SoundCloud, Spotify, Threads, and Vimeo.

No metadata system can read content behind a login, private account, paywall,
CAPTCHA, expired signed URL, or site-level bot block. In those cases, add a
factual note after the URL in Telegram; Keeps treats that note as the trusted
context and still links to the original.

#### Delete a Keep

Deletion stays inside the owner-only Telegram workflow. Either send:

```text
/delete https://example.com/the-saved-link
```

or reply `/delete` to the original link message in the bot conversation. The
bot responds with `Deleted from Keeps.` or explains that the link was not found.
Running `bun run telegram:webhook` also registers `/delete` in Telegram's bot
command menu.

#### Duplicate protection

Before a link is read or saved, Keeps removes fragments and common tracking
parameters, converts Twitter URLs to `x.com`, removes X share parameters, and
normalizes YouTube short and full URLs to one canonical form. PostgreSQL also
enforces a unique constraint on `href`, and `saveKeep()` uses an upsert. Sending
the same content again refreshes the existing Keep instead of creating another
card. On schema initialization, existing URLs are normalized and older duplicate
rows are removed.

#### Live updates

Ably carries lightweight change notifications; it never replaces Neon as the
source of truth. Telegram publishes to `public:keeps`, and Saved Keeps mutations
publish to the collection's private channel. On receipt, the browser fetches the
durable state. Public feed fallback refresh is ten minutes; private Saved Keeps
fallback reconciliation is fifteen minutes. Both refresh immediately on focus
or reconnect. There is no long-running Vercel SSE function and no database
polling loop.

#### Free-plan cost controls

- `/keeps` is statically generated, revalidates daily, and is invalidated by
  Telegram changes. `listKeeps()` is cached for a day with the `keeps` tag.
- Public `/api/keeps` responses are shared at the edge. Ably provides immediate
  invalidation, so fallback polling can stay infrequent.
- Public Ably subscribe-only tokens are cached at the edge for five minutes;
  Ably tokens last six hours to reduce token-function invocations.
- Saved Keeps only writes to Postgres after a user explicitly exports. Local
  favourites remain free `localStorage` operations.
- Spotify access tokens are reused in warm instances and now-playing responses
  are shared at the edge. Clients poll at fifteen/sixty seconds rather than
  five/twenty seconds.
- Country information is cached on the device for twenty-four hours. In
  production, Vercel country/timezone headers avoid GeoJS entirely in the usual
  case.
- The Flip Clock is entirely local and creates no network or server usage.
- Google Analytics loads client-side and does not consume Vercel Functions.

Preserve these controls unless a paid traffic or latency requirement justifies
the additional recurring requests.

If a message has no link, the bot asks for a post or page link. If processing
fails, it asks the owner to try again. Check the Vercel function logs and the
Cencori project logs for the underlying error. Common causes are missing
environment variables, an invalid PostgreSQL connection, a private or blocked
URL, and social platforms refusing metadata access.

The webhook returns to Telegram before link reading, AI generation, and database
work finish. This prevents Telegram from retrying simply because enrichment took
several seconds. Next.js `after()` keeps the background work within the route's
configured execution window.

#### Deployment and command checklist

Run the local application:

```bash
bun run dev
```

Validate types and the complete production build before deploying:

```bash
bun run typecheck
bun run build
```

For a first production setup or any credential change:

1. Add every variable from the Keeps environment section to Vercel Production.
2. Redeploy the application so the server can read the new values.
3. Register the webhook and Telegram command menu:

   ```bash
   bun run telegram:webhook
   ```

4. Check Telegram's current webhook state:

   ```bash
   bun -e 'const token=process.env.TELEGRAM_BOT_TOKEN; const response=await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`); console.log(JSON.stringify(await response.json(),null,2))'
   ```

5. Send one test link to the bot and confirm the reply, the Vercel function log,
   and the new card at `https://daaysorn.com/keeps`.

Rerun `bun run telegram:webhook` after changing the deployed webhook URL or its
registered commands. Do not use `getUpdates` while a webhook is active; remove
the webhook first only when owner-ID troubleshooting requires it.

### Gallery publishing pipeline

The Gallery reads uploaded media metadata from PostgreSQL and serves optimized
files from Cloudflare R2. It also retains `public/images/gallery/` as a
build-time fallback for manually committed image and video files. When neither
source contains media, `/gallery` displays `Nothing yet`.

The publishing flow reuses the owner-only Telegram bot but keeps Gallery
messages explicitly separate from Keeps:

```text
Tomiwa sends images, videos, or a Telegram media album
  → Telegram POSTs the update to the existing webhook
  → the route verifies Telegram's secret and TELEGRAM_OWNER_ID
  → photo[], video, or an image/video document routes automatically to Gallery
  → updates sharing a media_group_id are collected as one album
  → the Gallery branch downloads and validates every attached media file
  → images get responsive WebP variants; videos retain their Telegram poster
  → immutable media files are uploaded to Cloudflare R2
  → PostgreSQL stores the media metadata and Telegram message ID
  → the Gallery cache is invalidated
  → /gallery reads the updated metadata and renders the masonry layout
```

#### Keeps isolation

Gallery uploads must not change link bookmarking:

- A message containing Telegram `photo` sizes, `video`, or a document whose
  MIME type starts with `image/` or `video/` goes only to the Gallery handler.
  No command is required.
- Ordinary link messages continue through the existing Keeps handler.
- `/delete <url>` deletes a Keep.
- Replying `/delete` to the original image or video message deletes that Gallery
  item and its Cloudflare R2 objects.
- A non-image document receives usage instructions and is not inserted into
  either collection unless its text or caption contains a valid Keep URL.
- Gallery and Keeps use separate database tables, validation, storage helpers,
  cache tags, and Ably events if Gallery realtime updates are added later.

Media-first routing prevents a media caption containing a URL from accidentally
creating a Keep. The Telegram webhook can be shared safely; the processing
branches must remain independent. If a message contains both images and links,
the images and caption belong to Gallery and its links are not sent to Keeps.

#### Telegram Gallery messages

The intended owner-only formats require no upload command:

```text
# Add one image or video. The caption becomes its accessible description.
[attach image or video]
Weekend in Lagos

# Add several images and videos as one Gallery album.
[select several media files and send them together as a Telegram album]
Weekend in Lagos

# Delete an uploaded image or video.
[reply /delete to the original media message]
```

Reply to the original upload, not the bot's `Gallery: 1 added` confirmation.
For a Telegram album, reply to each original album item that should be removed.

Telegram sends an album as multiple webhook updates with the same
`media_group_id`, not as one message. The Gallery stores those items in a
durable database-backed batch, waits briefly for the group, claims it atomically,
preserves Telegram's image order, and sends one summary reply. The queue is not
held in memory because Vercel can run album updates on different function
instances.

For a single Telegram photo, select the largest entry in its `photo[]` array;
the smaller entries are Telegram thumbnails, not separate Gallery images. For a
Telegram album, select the largest entry from each album message and deduplicate
using `file_unique_id` before uploading. Videos use Telegram's video
`file_unique_id` and thumbnail when available.

#### Duplicate protection

Duplicate checks happen before any expensive transformation or R2 write:

1. Put a unique database constraint on Telegram's `file_unique_id`. Resending
   the same Telegram media returns the existing Gallery item.
2. Download new IDs once and compute a SHA-256 content hash. Put a second unique
   constraint on that hash to catch the same file uploaded under another name.
3. Deduplicate every Telegram album before processing, then insert all accepted
   items in one transaction.
4. Use the SHA-256 hash in immutable R2 object keys. Never upload when that hash
   already exists.

These checks reliably stop repeated sends and byte-identical files. A photo or
video that has been re-exported, recompressed, cropped, or edited has different
bytes and is treated as new. Perceptual duplicate detection can be added later,
but video fingerprinting is computationally expensive and is intentionally not
part of the free-plan baseline.

Send media as a Telegram **document** when the original quality matters.
Sending it as a normal photo or video may let Telegram compress it. The hosted Telegram Bot
API currently allows bots to download files up to 20 MB, so the handler must
reject a larger attachment with a clear response instead of attempting the R2
upload.

#### Cloudflare R2 setup

Use an R2 Standard bucket and connect a production custom domain such as
`images.daaysorn.com`. Do not use an `r2.dev` URL in production because it does
not provide Cloudflare Cache, WAF, or the same production controls.

Keep the bucket credentials server-side:

```env
CLOUDFLARE_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=daaysorn-gallery
R2_PUBLIC_BASE_URL=https://images.daaysorn.com
```

Never prefix R2 credentials with `NEXT_PUBLIC_`. Only
`R2_PUBLIC_BASE_URL` is safe for browser-visible image URLs. Add the same
server-side values to Vercel Production and Preview only where the Gallery
upload pipeline should operate.

R2 public buckets cannot be used as a public directory listing. PostgreSQL must
remain the Gallery index and store, at minimum:

- Gallery ID, media type, and immutable object keys
- Small, medium, and large image URLs or video and poster URLs
- Width, height, format, and byte size for each variant
- Caption and accessible alternative text
- Display order, visibility, and creation time
- Telegram message ID, `file_unique_id`, and SHA-256 content hash

#### Image performance and caching

Optimize each upload once instead of paying to transform it again for every
visitor:

1. Correct orientation from EXIF data and discard unnecessary metadata.
2. Never enlarge an image beyond its original dimensions.
3. Generate bounded small, medium, and large variants appropriate for the
   Gallery's Bento cells.
4. Prefer AVIF, with WebP as a compatibility fallback when required.
5. Put a content hash in every object key, for example
   `gallery/<hash>/medium.avif`.
6. Serve immutable variants with
   `Cache-Control: public, max-age=31536000, immutable`.
7. Use responsive `sizes`, lazy loading below the fold, explicit dimensions or
   aspect ratios, and a lightweight placeholder to prevent layout movement.
8. Never overwrite an existing object key. Upload a new hashed key so cached
   visitors cannot receive stale bytes.
9. After a delete, remove the database row immediately. Delete the R2 objects
   and purge their Cloudflare cache entries when immediate removal is required.

#### Video performance and caching

- Accept Telegram `video` objects and documents with a `video/*` MIME type.
- Prefer MP4 with H.264 video, AAC audio, and fast-start metadata for broad
  browser support. Preserve a compatible upload instead of re-encoding it.
- Do not perform heavy video transcoding inside a Vercel Function. Reject an
  incompatible file with a clear Telegram response or move transcoding to a
  dedicated asynchronous service later.
- Store and serve a lightweight poster image. Use Telegram's thumbnail when it
  is suitable; otherwise generate one frame during background processing.
- Render videos with `playsInline`, controls, no autoplay, and
  `preload="metadata"` or `preload="none"` below the fold.
- Use the same content-hashed immutable keys and one-year cache header as image
  variants. Video byte-range requests must remain enabled for seeking.

Because the variants are already optimized, the Gallery should serve them
directly from the Cloudflare custom domain rather than run every request through
Vercel Image Optimization. This avoids Vercel transformation usage while the
Cloudflare edge cache handles repeated delivery. The Gallery metadata query can
use a long server cache tagged `gallery`; successful Telegram additions and
deletions invalidate only that tag.

Cloudflare R2 Standard currently includes 10 GB-month of storage, one million
Class A operations, ten million Class B operations, and free internet egress per
month. Recheck the official R2 pricing page before relying on those limits in a
future production launch.

Official references:

- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Enable Cloudflare Cache for R2](https://developers.cloudflare.com/cache/interaction-cloudflare-products/r2/)
- [Cloudflare R2 public buckets](https://developers.cloudflare.com/r2/buckets/public-buckets/)
- [Telegram Bot API `getFile`](https://core.telegram.org/bots/api#getfile)

### PWA offline and background refresh

`public/sw.js` is a dependency-free service worker registered immediately in
production by `components/pwa-register.tsx`. Development unregisters it and
removes daaysorn caches so localhost never hides code changes behind stale PWA
responses.

The worker provides only capabilities that match this project:

- The OS share target posts `title`, `text`, and `url` as
  `multipart/form-data` to `/api/keeps/share-target`. The handler validates and
  bounds the strings, redirects to a temporary fragment on `/keeps`, and the
  client removes that fragment immediately after finding the shared link. File
  parameters are intentionally omitted because Keeps accepts links; owner media
  publishing remains in the Telegram Gallery workflow.
- Home, Keeps, Gallery, the offline fallback, manifest, icons, visited Next.js
  assets, local images, and Cloudflare Gallery media are cached.
- Navigations use network-first delivery and fall back to the cached page or
  `/offline` when no saved response exists.
- Saved Keeps changes remain in the page's local fallback queue and are also
  copied into a deduplicated IndexedDB outbox owned by the service worker when
  the device is offline or an immediate sync request fails. Supported browsers
  register `daaysorn-sync-saved-keeps`; its Background Sync handler sends the
  authenticated changes after connectivity stabilizes, removes only the exact
  submitted versions, and notifies open Keeps tabs with the returned saved IDs.
- After a connection loss, supported browsers also register
  `daaysorn-refresh-offline-content` to refresh the cached pages.
- Supported browsers may register `daaysorn-daily-content-refresh` with a
  one-day minimum interval. Its Periodic Sync handler refreshes cached Home,
  Keeps, Gallery, and offline pages. Browser scheduling and permission remain
  discretionary.
- Browsers without Background Sync or Periodic Sync continue to use the
  localStorage queue, network-first caching, and the existing online, focus,
  interval, and Ably Saved Keeps synchronization.

Do not add PWABuilder capabilities only to raise its score. Notes, push
notifications, file handlers, protocol handlers, widgets, tabbed display,
native-app relations, IARC metadata, and cross-domain scope extensions remain
out until daaysorn has a real feature requiring them.

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
