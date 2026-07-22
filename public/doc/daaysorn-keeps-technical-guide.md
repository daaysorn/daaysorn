# How daaysorn Keeps works

daaysorn Keeps is a curated content pipeline for collecting useful links, enriching them with structured metadata, publishing them to a public feed, and allowing visitors to save favourites across devices.

- Public page: [daaysorn.com/keeps](https://daaysorn.com/keeps)
- Source repository: [github.com/daaysorn/daaysorn](https://github.com/daaysorn/daaysorn)
- Dependency list: [package.json](https://github.com/daaysorn/daaysorn/blob/main/package.json)

## Technology stack

Keeps uses:

- [Next.js 16](https://nextjs.org/) and React 19
- TypeScript
- [Neon Postgres](https://neon.com/) for Keeps and device-sync records
- [Cencori](https://cencori.com/) for AI metadata generation, vision analysis, and editorial review
- [Files SDK](https://files-sdk.dev/) to write once and store to R2 via one unified interface
- [Cloudflare R2](https://developers.cloudflare.com/r2/) as the object store backend
- [Sharp](https://sharp.pixelplumbing.com/) for image resizing and WebP conversion
- [Ably](https://ably.com/) for realtime public-feed and private-device updates
- [SWR](https://swr.vercel.app/) for browser-side refreshes
- [Telegram Bot API](https://core.telegram.org/bots/api) for owner-controlled content ingestion
- Google Analytics for product events
- Service Worker, Cache Storage, and IndexedDB for PWA and offline support
- Tailwind CSS, shadcn-based components, and react-icons for the interface

## 1. Telegram is connected to daaysorn

The Telegram Bot API sends updates to:

```text
https://daaysorn.com/api/telegram/keeps
```

The webhook is registered with:

```bash
bun run telegram:webhook
```

The setup script reads `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, and `NEXT_PUBLIC_SITE_URL`. It calls Telegram's `setWebhook` endpoint and registers commands through `setMyCommands`.

Implementation:

- [Webhook registration script](https://github.com/daaysorn/daaysorn/blob/main/scripts/set-telegram-keeps-webhook.ts)
- [Telegram webhook route](https://github.com/daaysorn/daaysorn/blob/main/app/api/telegram/keeps/route.ts)

The main Keeps commands are:

```text
/keep <link> #optional-tags
/deletekeep <link>
/help
/start
```

A normal Telegram message containing a link can also create a Keep without explicitly including `/keep`.

## 2. The Telegram webhook is authenticated

Telegram supplies the configured webhook secret in:

```text
x-telegram-bot-api-secret-token
```

The route compares it with `TELEGRAM_WEBHOOK_SECRET`. Invalid webhook requests receive `401 Unauthorized`.

It also compares the sender's Telegram ID with `TELEGRAM_OWNER_ID`. Only the configured owner can add or delete Keeps; other senders receive `403 Forbidden`.

Bot credentials and webhook secrets remain on the server and are never sent to the Keeps browser interface.

## 3. Links and context are extracted

The webhook searches Telegram message text, captions, text-link entities, and replied-to messages. A single message can contain up to five unique links.

Example:

```text
/keep https://example.com/design-system

Useful explanation of design tokens and component architecture.

#Design #Development
```

The submitted material provides the URL, Tomiwa's optional context, optional tag hints, and Telegram message ID. Hashtags act as editorial hints; they do not bypass the approved public taxonomy.

## 4. URLs are normalised

The normaliser creates one canonical version of every resource. It removes fragments, `www`, tracking parameters, and trailing slashes. It also canonicalises X and YouTube URLs and removes unnecessary Instagram, TikTok, and Threads parameters.

Common parameters removed include:

```text
utm_*
fbclid
gclid
igsh
mc_cid
mc_eid
ref_src
```

For example:

```text
https://www.youtube.com/shorts/VIDEO_ID?utm_source=test
```

becomes:

```text
https://youtube.com/watch?v=VIDEO_ID
```

Implementation: [URL normalisation](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/url.ts)

## 5. The URL passes security checks

Before fetching a page, Keeps confirms that the URL uses HTTP or HTTPS. DNS resolution is used to reject private or local addresses such as `127.0.0.1`, `10.x.x.x`, `192.168.x.x`, the private `172.x.x.x` range, and `::1`.

Redirects are checked and limited. These controls reduce Server-Side Request Forgery risk and prevent submitted links from reaching internal services.

Implementation: [Keeps enrichment pipeline](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/enrich.ts)

## 6. The source platform is identified

Recognised domains are mapped to source labels:

| Domain | Source |
| --- | --- |
| `x.com` | X |
| `instagram.com` | Instagram |
| `youtube.com` | YouTube |
| `tiktok.com` | TikTok |
| `github.com` | GitHub |
| `behance.net` | Behance |
| `dribbble.com` | Dribbble |
| `facebook.com` | Facebook |
| `linkedin.com` | LinkedIn |
| `reddit.com` | Reddit |
| `open.spotify.com` | Spotify |
| `soundcloud.com` | SoundCloud |
| `threads.net` | Threads |
| `vimeo.com` | Vimeo |
| Other domains | Article |

The source controls the metadata strategy, fallback wording, preview handling, and source icon displayed in the interface.

## 7. Public metadata is collected

Keeps attempts to collect the page title, description, Open Graph fields, Twitter card fields, author, readable page text, oEmbed data, and the context submitted by Tomiwa.

Specialised public endpoints include:

```text
https://publish.twitter.com/oembed
https://www.youtube.com/oembed
https://www.tiktok.com/oembed
https://www.instagram.com/api/v1/oembed/
```

Keeps can also discover `application/json+oembed` links declared by other websites. Requests use timeouts, response limits, and controlled redirect handling.

## 8. Platform-specific evidence rules are applied

### X

Public X oEmbed text is the primary evidence. An account name or handle is not accepted as an editorial title.

### YouTube

YouTube oEmbed data supplies the public video title, channel name, and thumbnail.

### TikTok

TikTok oEmbed data may provide the title, creator, and thumbnail. Keeps does not claim to have a transcript when one is unavailable.

### Instagram

Keeps attempts public page metadata, oEmbed data, preview-image analysis, and a stored preview or screenshot. Profiles, posts, reels, and stories are distinguished from one another. If there is not enough verifiable context, the link is rejected instead of receiving invented copy.

### Articles and other sites

Keeps reads standard metadata and a limited amount of readable HTML page text.

## 9. Preview images are processed and stored

Third-party preview URLs can expire or block remote loading, so Keeps stores a controlled copy in Cloudflare R2 through Files SDK.

The image pipeline:

1. Downloads no more than 8 MB.
2. Confirms that the response is an image.
3. Corrects image orientation with Sharp.
4. Resizes it to a maximum 720 × 900 frame.
5. Converts it to WebP at 78% quality.
6. Hashes the output with SHA-256.
7. Uploads it to Cloudflare R2.
8. Applies a one-year immutable cache policy.

Stored objects use paths similar to:

```text
keeps/previews/{sha256-hash}.webp
```

Required R2 configuration:

```text
CLOUDFLARE_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET_NAME
R2_PUBLIC_BASE_URL
```

Optional Files SDK feature flags:

```text
FILES_SDK_LOG=1
```

When enabled, Files SDK lifecycle hooks log per-operation timings plus retry attempts.

If a source has no useful image, Keeps can call an external screenshot service configured through `KEEP_SCREENSHOT_SERVICE_URL` and `KEEP_SCREENSHOT_API_KEY`.

Implementation:

- [Files SDK + R2 setup](https://github.com/daaysorn/daaysorn/blob/main/lib/files.ts)
- [Preview storage](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/preview-storage.ts)

## 10. Cencori generates editorial metadata

When `CENCORI_API_KEY` is configured, Cencori generates a clear title, concise summary, author, and one or two topic tags from structured evidence.

The configurable model variables are:

```text
CENCORI_KEEPS_MODEL
CENCORI_KEEPS_REVIEW_MODEL
CENCORI_KEEPS_VISION_MODEL
```

Current defaults are `gpt-4.1-nano` for generation and vision analysis and `gpt-4.1-mini` for editorial review.

The generator is instructed to write natural English, use evidence-supported claims, limit the summary to two sentences, remove hashtags, avoid emojis in titles, and avoid generic promotional language.

Implementation: [AI generation and review](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/enrich.ts)

## 11. Tags use a controlled taxonomy

Keeps selects no more than two broad topics from the approved taxonomy:

```text
AI
Business
Career
Culture
Design
Development
Education
Entertainment
Finance
Food
Housing
Lifestyle
Parenting
Science
Security
Technology
Travel
```

Implementation: [Keeps metadata rules](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/metadata.ts)

## 12. A second AI pass reviews the result

An independent review compares the proposed metadata with the supplied evidence. It rejects unsupported statements, incorrect authors, wrong resource types, generic titles, platform boilerplate, promotional language, and irrelevant tags.

Deterministic checks also reject access-challenge text, vague filler, and X titles that only contain an identity. If the first version fails, the generator receives concrete review feedback and tries once more. If the revised version still fails, Keeps uses a deterministic evidence-based fallback.

## 13. The Keep is stored in Neon Postgres

Each record contains:

```text
id
href
source
author
title
summary
image_url
tags
telegram_message_id
raw_text
ai_format_version
saved_at
```

The canonical `href` is unique. Submitting an existing canonical URL updates that Keep instead of creating a duplicate.

Database migrations run with:

```bash
bun run db:migrate
```

The database connection is configured with `DATABASE_URL`.

Implementation:

- [Keeps database](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/db.ts)
- [Keeps types](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/types.ts)
- [Database migration script](https://github.com/daaysorn/daaysorn/blob/main/scripts/migrate-database.ts)

## 14. Telegram receives the processing result

The route uses Next.js `after()` so it can acknowledge the Telegram webhook while enrichment continues. A successful reply lists the editorial titles that were kept. Failures include sanitised explanations with credentials, bearer tokens, passwords, and API keys removed.

After a successful save, the server publishes a public realtime event.

## 15. Keeps can be deleted through Telegram

Tomiwa can send:

```text
/deletekeep https://example.com/resource
```

The command can also reply to the original link message. The URL is normalised before deletion. When deletion succeeds, the public realtime channel is notified so open browsers can refresh.

## 16. The public page loads the collection

Public page:

```text
https://daaysorn.com/keeps
```

The Next.js page is force-dynamic and bypasses stale server caching. It reads up to 100 Keeps from Neon, orders them by `saved_at DESC`, formats dates in the `Africa/Lagos` timezone, and server-renders the initial collection.

Implementation:

- [Keeps page](https://github.com/daaysorn/daaysorn/blob/main/app/keeps/page.tsx)
- [Keeps interface](https://github.com/daaysorn/daaysorn/blob/main/components/keeps/keeps-view.tsx)
- [Keeps loading state](https://github.com/daaysorn/daaysorn/blob/main/components/keeps/keeps-skeleton.tsx)

## 17. SWR keeps browser data fresh

The browser reads:

```text
GET https://daaysorn.com/api/keeps
```

SWR uses the server-rendered collection as fallback data, refreshes every ten minutes, and revalidates when the browser regains focus or reconnects.

The API responds with `Cache-Control: no-store, max-age=0`. If the database is unavailable, it returns `503` with an empty collection.

Implementation: [Public Keeps API](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/route.ts)

## 18. Ably provides realtime public updates

The public Ably channel is:

```text
public:keeps
```

Browsers request a restricted subscription token from:

```text
GET /api/keeps/public-realtime-token
```

When a Keep is added or deleted, the server publishes a `changed` event. Connected browsers receive it and request a fresh `/api/keeps` response. `ABLY_API_KEY` supplies the server credential.

Implementation:

- [Realtime helpers](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/realtime.ts)
- [Public realtime token route](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/public-realtime-token/route.ts)
- [Private realtime token route](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/realtime-token/route.ts)

## 19. The feed supports discovery, filters, and search

The default All view uses a seeded daily shuffle. The order changes each day but remains stable throughout that day. Latest uses the database's newest-first order.

Search checks titles, summaries, sources, authors, and tags. The filter bar contains All, Saved Keeps, Latest, and up to 12 frequently used approved topic tags.

## 20. Every card links to the original resource

Selecting a Keep opens its canonical URL in a new tab using `noopener noreferrer`.

Cards include a preview, source, saved date, title, summary, tags, favourite control, native share control, social sharing links, and a View action.

Direct sharing uses:

```text
https://www.facebook.com/sharer/sharer.php
https://twitter.com/intent/tweet
https://wa.me/
https://www.linkedin.com/sharing/share-offsite/
```

Supported devices use the Web Share API. Other devices fall back to the Clipboard API.

## 21. Saved Keeps begin in local storage

Visitors do not need an account. Favourite IDs are stored under:

```text
daaysorn-keeps-favourites
```

Saving or removing a Keep updates React state, local storage, the Saved Keeps count, and the Saved Keeps filter immediately.

Implementation: [Device-sync helpers](https://github.com/daaysorn/daaysorn/blob/main/lib/device-sync.ts)

## 22. Saved Keeps can be exported to other devices

Selecting **Export to other devices** calls:

```text
POST /api/keeps/sync
```

The server creates a UUID group ID, a 32-byte random secret, and an anonymous display name. The resulting private URL follows this structure:

```text
https://daaysorn.com/keeps#keeps-sync={group-id}.{secret}
```

Only a SHA-256 hash of the secret is stored in Neon. Opening the private URL on another device connects it to the same Saved Keeps collection.

Implementation:

- [Sync API](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/sync/route.ts)
- [Sync database](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/sync-db.ts)

## 23. Changes synchronise between devices

Authenticated requests use:

```http
Authorization: Bearer {group-id}.{secret}
```

The API supports:

```text
POST  /api/keeps/sync   Create a sync group
GET   /api/keeps/sync   Read saved IDs
PATCH /api/keeps/sync   Save or remove IDs
```

After changing the database, the server publishes to:

```text
private:keeps:{group-id}
```

Other connected devices receive the event and retrieve the authoritative saved-ID collection.

## 24. Offline changes are preserved

When a connected device is offline, the pending operation is placed in IndexedDB by the service worker.

```text
Database: daaysorn-keeps-sync
Store: outbox
Sync tag: daaysorn-sync-saved-keeps
```

When connectivity returns, the service worker retries `/api/keeps/sync`, deletes accepted outbox entries, and notifies open daaysorn windows with the updated saved IDs.

Implementation: [Service worker](https://github.com/daaysorn/daaysorn/blob/main/public/sw.js)

## 25. daaysorn is installable as a PWA

Manifest URL:

```text
https://daaysorn.com/manifest.webmanifest
```

The manifest supplies standalone display, app icons, install screenshots, Keeps and Gallery shortcuts, and an operating-system share target.

Implementation:

- [Web app manifest](https://github.com/daaysorn/daaysorn/blob/main/app/manifest.ts)
- [Service worker registration](https://github.com/daaysorn/daaysorn/blob/main/components/pwa-register.tsx)
- [Install prompt](https://github.com/daaysorn/daaysorn/blob/main/components/pwa-install-prompt.tsx)
- [Offline page](https://github.com/daaysorn/daaysorn/blob/main/app/offline/page.tsx)

## 26. Other apps can share existing Keeps

The PWA share target is:

```text
POST /api/keeps/share-target
```

The operating system can submit a title, text, and URL. The route encodes the payload and redirects to:

```text
/keeps#share-target={encoded-payload}
```

The browser decodes and normalises the URL, finds a matching public Keep, saves it locally, and opens Saved Keeps. This path saves an existing public Keep; Telegram remains the owner-controlled publication path.

Implementation: [Share-target route](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/share-target/route.ts)

## 27. Google Analytics records product activity

Keeps records events such as:

```text
keeps_view
keep_impression
keep_open
keep_favourite
keep_share
keeps_search
keeps_filter
keeps_sync
keeps_realtime
keeps_export
keep_preview_error
```

Private sync secrets and private connection URLs are not included in these event parameters.

Implementation: [Analytics helpers](https://github.com/daaysorn/daaysorn/blob/main/lib/analytics.ts)

## Complete architecture flow

```text
Telegram message
    ↓
Telegram Bot API
    ↓
POST /api/telegram/keeps
    ↓
Webhook-secret and owner-ID authentication
    ↓
Link, note, and tag extraction
    ↓
URL normalisation and SSRF protection
    ↓
Public metadata and oEmbed collection
    ↓
Cencori metadata generation
    ↓
Independent AI quality review
    ↓
Sharp image processing
    ↓
Cloudflare R2 preview storage
    ↓
Neon Postgres
    ↓
Ably public realtime event
    ↓
Next.js /keeps page and /api/keeps
    ↓
SWR browser refresh
    ↓
Search, filters, sharing, and local favourites
    ↓
Neon device-sync groups and Ably private channels
    ↓
Service Worker and IndexedDB offline recovery
```

## Main implementation links

- [Keeps page](https://github.com/daaysorn/daaysorn/blob/main/app/keeps/page.tsx)
- [Keeps interface](https://github.com/daaysorn/daaysorn/blob/main/components/keeps/keeps-view.tsx)
- [Telegram webhook](https://github.com/daaysorn/daaysorn/blob/main/app/api/telegram/keeps/route.ts)
- [Enrichment pipeline](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/enrich.ts)
- [URL normalisation](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/url.ts)
- [Keeps database](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/db.ts)
- [Preview storage](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/preview-storage.ts)
- [Realtime integration](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/realtime.ts)
- [Sync API](https://github.com/daaysorn/daaysorn/blob/main/app/api/keeps/sync/route.ts)
- [Sync database](https://github.com/daaysorn/daaysorn/blob/main/lib/keeps/sync-db.ts)
- [PWA manifest](https://github.com/daaysorn/daaysorn/blob/main/app/manifest.ts)
- [Service worker](https://github.com/daaysorn/daaysorn/blob/main/public/sw.js)
