import { NextResponse, type NextRequest } from "next/server"

/**
 * One-time dev helpers to mint a Spotify refresh token. Consumed by the thin
 * route shims in `app/api/spotify-auth/{login,callback}/route.ts`.
 *
 * Dev-only: both handlers 403 in production.
 */

const SCOPES = [
  "user-read-currently-playing",
  "user-read-recently-played",
  "user-read-playback-state",
].join(" ")

const DEFAULT_REDIRECT_URI = "http://127.0.0.1:3000/api/spotify-auth/callback"

/** Step 1: redirect the user to Spotify's consent screen. */
export async function spotifyLogin() {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Disabled in production.", { status: 403 })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  if (!clientId) {
    return new NextResponse(
      "Missing SPOTIFY_CLIENT_ID in .env.local — add it and restart the dev server.",
      { status: 500 }
    )
  }

  // Pinned so it exactly matches the dashboard. Spotify requires 127.0.0.1
  // (not localhost) for loopback, and the dev server's origin can't be trusted.
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI ?? DEFAULT_REDIRECT_URI
  const state = crypto.randomUUID()

  const authUrl = new URL("https://accounts.spotify.com/authorize")
  authUrl.searchParams.set("response_type", "code")
  authUrl.searchParams.set("client_id", clientId)
  authUrl.searchParams.set("scope", SCOPES)
  authUrl.searchParams.set("redirect_uri", redirectUri)
  authUrl.searchParams.set("state", state)

  const res = NextResponse.redirect(authUrl.toString())
  // Round-trip the state through an httpOnly cookie for basic CSRF protection.
  res.cookies.set("spotify_auth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  })
  return res
}

/**
 * Standalone HTML shell for the Spotify auth helper.
 * Mirrors daaysorn design tokens (see app/globals.css) — semantic roles only.
 * Fonts: Montserrat (headings), Geist (body), JetBrains Mono (code).
 */
function htmlPage(title: string, body: string, status = 200) {
  const doc = `<!doctype html>
<html lang="en" class="dark">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Montserrat:wght@500;600&display=swap" rel="stylesheet" />
  <style>
    :root {
      --background: oklch(1 0 0);
      --foreground: oklch(0.145 0 0);
      --card: oklch(1 0 0);
      --card-foreground: oklch(0.145 0 0);
      --primary: oklch(0.205 0 0);
      --primary-foreground: oklch(0.985 0 0);
      --muted: oklch(0.97 0 0);
      --muted-foreground: oklch(0.556 0 0);
      --destructive: oklch(0.577 0.245 27.325);
      --border: oklch(0.922 0 0);
      --input: oklch(0.922 0 0);
      --ring: oklch(0.708 0 0);
      --radius: 0.625rem;
      --font-sans: "Geist", ui-sans-serif, system-ui, sans-serif;
      --font-heading: "Montserrat", ui-sans-serif, system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, monospace;
    }
    .dark {
      --background: oklch(0 0 0);
      --foreground: oklch(0.985 0 0);
      --card: oklch(0.205 0 0);
      --card-foreground: oklch(0.985 0 0);
      --primary: oklch(0.922 0 0);
      --primary-foreground: oklch(0.205 0 0);
      --muted: oklch(0.269 0 0);
      --muted-foreground: oklch(0.708 0 0);
      --destructive: oklch(0.704 0.191 22.216);
      --border: oklch(1 0 0 / 10%);
      --input: oklch(1 0 0 / 15%);
      --ring: oklch(0.556 0 0);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 1.5rem;
      background: var(--background);
      color: var(--foreground);
      font: 15px/1.6 var(--font-sans);
      -webkit-font-smoothing: antialiased;
    }
    .card {
      width: 100%;
      max-width: 28rem;
      padding: 1.75rem;
      background: var(--card);
      color: var(--card-foreground);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 1.8);
    }
    h1 {
      margin: 0 0 0.5rem;
      font-family: var(--font-heading);
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--foreground);
    }
    p { margin: 0.5rem 0; color: var(--muted-foreground); }
    a { color: var(--primary); font-weight: 600; text-underline-offset: 4px; }
    a:hover { text-decoration: underline; }
    code, .token, .env {
      font-family: var(--font-mono);
    }
    code {
      font-size: 0.875em;
      color: var(--primary);
      font-weight: 500;
      overflow-wrap: anywhere;
      word-break: break-all;
    }
    .token, .env {
      display: block;
      width: 100%;
      max-width: 100%;
      min-width: 0;
      margin: 0.875rem 0;
      padding: 0.75rem 0.875rem;
      background: var(--muted);
      border: 1px solid var(--border);
      border-radius: calc(var(--radius) * 0.8);
      color: var(--foreground);
      font-size: 0.8125rem;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      word-break: break-all;
      overflow-x: hidden;
    }
    .token {
      resize: none;
    }
    .token:focus-visible {
      outline: none;
      border-color: var(--ring);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent);
    }
    button {
      appearance: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      height: 2.25rem;
      padding: 0 0.625rem;
      border: 1px solid transparent;
      border-radius: calc(var(--radius) * 0.8);
      background: var(--primary);
      color: var(--primary-foreground);
      font: 500 0.875rem/1 var(--font-sans);
      cursor: pointer;
      transition: background 0.15s ease;
    }
    button:hover { background: color-mix(in oklch, var(--primary) 80%, transparent); }
    button:focus-visible {
      outline: none;
      border-color: var(--ring);
      box-shadow: 0 0 0 3px color-mix(in oklch, var(--ring) 50%, transparent);
    }
    .env {
      margin-top: 1.125rem;
      font-size: 0.75rem;
    }
    .warn {
      margin-top: 1.125rem;
      color: var(--muted-foreground);
      font-size: 0.8125rem;
    }
    .err { color: var(--destructive); }
  </style>
</head>
<body><div class="card">${body}</div></body>
</html>`
  return new NextResponse(doc, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  })
}

/** Step 2: exchange the returned code for a refresh token and show it. */
export async function spotifyCallback(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return new NextResponse("Disabled in production.", { status: 403 })
  }

  const url = new URL(request.url)
  const code = url.searchParams.get("code")
  const state = url.searchParams.get("state")
  const oauthError = url.searchParams.get("error")
  const cookieState = request.cookies.get("spotify_auth_state")?.value

  const fail = (msg: string) =>
    htmlPage(
      "Spotify auth failed",
      `<h1>Couldn't get a refresh token</h1><p class="err">${msg}</p><p>Start over at <code>/api/spotify-auth/login</code>.</p>`,
      400
    )

  if (oauthError) return fail(`Spotify returned: ${oauthError}`)
  if (!code) return fail("No authorization code in the callback.")
  if (!state || state !== cookieState)
    return fail(
      "State mismatch — restart the flow from /api/spotify-auth/login."
    )

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret)
    return fail(
      "Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET in .env.local."
    )

  // Must match the redirect_uri sent to /authorize exactly.
  const redirectUri =
    process.env.SPOTIFY_REDIRECT_URI ??
    "http://127.0.0.1:3000/api/spotify-auth/callback"
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64")

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  })

  if (!tokenRes.ok) {
    const detail = await tokenRes.text()
    return fail(`Token exchange failed (${tokenRes.status}): ${detail}`)
  }

  const data = (await tokenRes.json()) as { refresh_token?: string }
  if (!data.refresh_token)
    return fail("Spotify didn't return a refresh token. Try again.")

  const token = data.refresh_token
  const tokenHtml = token
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")

  const res = htmlPage(
    "Spotify refresh token",
    `<h1>Your refresh token</h1>
     <p>Paste this into <code>.env.local</code> as <code>SPOTIFY_REFRESH_TOKEN</code>, then restart the dev server.</p>
     <textarea class="token" rows="3" readonly id="tok">${tokenHtml}</textarea>
     <button type="button" id="copy-btn">Copy token</button>
     <div class="env">SPOTIFY_REFRESH_TOKEN="${tokenHtml}"</div>
     <p class="warn">Treat this like a password. Delete <code>app/api/spotify-auth/</code> once you're done — you won't need it again.</p>
     <script>
       document.getElementById("copy-btn").addEventListener("click", async function () {
         var value = document.getElementById("tok").value;
         await navigator.clipboard.writeText(value);
         this.textContent = "Copied";
       });
     </script>`
  )
  // Clear the state cookie now that we're finished.
  res.cookies.set("spotify_auth_state", "", { path: "/", maxAge: 0 })
  return res
}
