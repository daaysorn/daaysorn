import { createHash } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"

import { createPerspective, getRantById } from "@/lib/rants/db"
import { sendRantsTelegramMessage } from "@/lib/rants/telegram"

type Submission = {
  rantId?: string
  name?: string
  email?: string
  body?: string
  website?: string
  turnstileToken?: string
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
  const email = input.email?.trim().toLowerCase().slice(0, 160) || null
  const body = input.body?.trim().replace(/\r\n/g, "\n").slice(0, 1200) ?? ""
  if (!rantId || name.length < 2 || body.length < 20) {
    return Response.json(
      { error: "Add your name and a thoughtful response." },
      { status: 400 }
    )
  }

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
      `${ip}:${request.headers.get("user-agent") ?? ""}:${process.env.TELEGRAM_WEBHOOK_SECRET ?? ""}`
    )
    .digest("hex")
  const result = await createPerspective({
    rantId,
    name,
    email,
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
      `From: ${name}`,
      body,
      `Approve: /approve ${result.id}`,
      `Reject: /reject ${result.id}`,
    ].join("\n\n")
  )
  revalidateTag("rants", { expire: 0 })
  revalidatePath(`/rants/${rant.slug}`)

  return Response.json({ ok: true })
}
