import { createHash } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"

import { createPerspective, getRantById } from "@/lib/rants/db"
import {
  authenticateKeepsSyncGroup,
  getKeepsSyncDisplayName,
  setKeepsSyncDisplayName,
} from "@/lib/keeps/sync-db"
import { sendRantsTelegramMessage } from "@/lib/rants/telegram"

type Submission = {
  rantId?: string
  name?: string
  body?: string
  website?: string
  turnstileToken?: string
}

function syncCredentials(request: Request) {
  const authorization = request.headers.get("authorization")
  if (!authorization?.startsWith("Bearer ")) return null
  const [id, secret] = authorization.slice(7).split(".", 2)
  return id && secret ? { id, secret } : null
}

async function validTurnstile(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return true
  if (!token) return false

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
      cache: "no-store",
    }
  )
  const result = (await response.json()) as { success?: boolean }
  return result.success === true
}

export async function POST(request: Request) {
  const input = (await request.json()) as Submission
  if (input.website) return Response.json({ ok: true })

  const rantId = input.rantId?.trim() ?? ""
  const name = input.name?.trim().replace(/\s+/g, " ").slice(0, 60) ?? ""
  const body = input.body?.trim().replace(/\r\n/g, "\n").slice(0, 1200) ?? ""
  if (!rantId || !body) {
    return Response.json(
      { error: "Add your Perspective before continuing." },
      { status: 400 }
    )
  }

  const sync = syncCredentials(request)
  if (!sync || !(await authenticateKeepsSyncGroup(sync.id, sync.secret))) {
    return Response.json(
      { error: "This device identity is unavailable. Refresh and try again." },
      { status: 401 }
    )
  }
  const displayName = name
    ? await setKeepsSyncDisplayName(sync.id, name)
    : await getKeepsSyncDisplayName(sync.id)

  const rant = await getRantById(rantId)
  if (!rant || rant.status !== "published") {
    return Response.json({ error: "Rant not found." }, { status: 404 })
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (!(await validTurnstile(input.turnstileToken, ip))) {
    return Response.json(
      { error: "Please complete the human check." },
      { status: 400 }
    )
  }

  const submitterHash = createHash("sha256")
    .update(
      `perspective:${sync.id}:${process.env.TELEGRAM_WEBHOOK_SECRET ?? ""}`
    )
    .digest("hex")
  const result = await createPerspective({
    rantId,
    name: displayName,
    body,
    submitterHash,
  })
  if (result.status === "rate_limited") {
    return Response.json(
      { error: "Please wait a little before submitting again." },
      { status: 429 }
    )
  }

  await sendRantsTelegramMessage(
    [
      `New Perspective on “${rant.title}”`,
      `From: ${displayName}`,
      body,
      "Use the buttons below to approve or reject this Perspective.",
    ].join("\n\n"),
    {
      inlineKeyboard: [
        [
          {
            text: "Approve",
            callbackData: `approve_perspective:${result.id}`,
          },
          {
            text: "Reject",
            callbackData: `reject_perspective:${result.id}`,
          },
        ],
      ],
    }
  )
  revalidateTag("rants", { expire: 0 })
  revalidatePath(`/rants/${rant.slug}`)

  return Response.json({ ok: true, name: displayName })
}
