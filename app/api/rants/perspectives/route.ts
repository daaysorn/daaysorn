import { createHash } from "node:crypto"
import { revalidatePath, revalidateTag } from "next/cache"

import {
  createPerspective,
  deleteOwnedPerspective,
  getOwnedPerspectiveForEdit,
  getRantById,
  hasPerspectiveContribution,
  listOwnedPerspectiveIds,
  stageOwnedPerspectiveEdit,
  updateOwnedPerspective,
} from "@/lib/rants/db"
import {
  authenticateKeepsSyncGroup,
  getKeepsSyncDisplayName,
  setKeepsSyncDisplayName,
} from "@/lib/keeps/sync-db"
import { sendRantsTelegramMessage } from "@/lib/rants/telegram"
import { publishRantsChanged } from "@/lib/rants/realtime"
import { moderatePerspectiveContent } from "@/lib/rants/moderation"

type Submission = {
  rantId?: string
  parentId?: string
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

function submitterHash(syncId: string) {
  return createHash("sha256")
    .update(
      `perspective:${syncId}:${process.env.TELEGRAM_WEBHOOK_SECRET ?? ""}`
    )
    .digest("hex")
}

function isAdminSync(syncId: string) {
  const adminSyncId = process.env.RANTS_ADMIN_SYNC_ID?.trim()
  return Boolean(adminSyncId && adminSyncId === syncId)
}

async function authenticatedSync(request: Request) {
  const sync = syncCredentials(request)
  if (!sync || !(await authenticateKeepsSyncGroup(sync.id, sync.secret))) {
    return null
  }
  return sync
}

async function refreshRant(rantId: string) {
  const rant = await getRantById(rantId)
  revalidateTag("rants", { expire: 0 })
  if (rant) revalidatePath(`/rants/${rant.slug}`)
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
  const parentId = input.parentId?.trim() || null
  const name = input.name?.trim().replace(/\s+/g, " ").slice(0, 60) ?? ""
  const body = input.body?.trim().replace(/\r\n/g, "\n").slice(0, 1200) ?? ""
  if (!rantId || !body) {
    return Response.json(
      { error: "Add your Perspective before continuing." },
      { status: 400 }
    )
  }

  const sync = await authenticatedSync(request)
  if (!sync) {
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

  const moderation = await moderatePerspectiveContent({
    rantTitle: rant.title,
    body,
    kind: parentId ? "reply" : "perspective",
  })
  const autoApproved = moderation.decision === "auto_approve"

  const result = await createPerspective({
    rantId,
    name: displayName,
    body,
    submitterHash: submitterHash(sync.id),
    parentId,
    status: autoApproved ? "approved" : "pending",
  })
  if (result.status === "invalid_parent") {
    return Response.json(
      { error: "The Perspective you replied to is unavailable." },
      { status: 404 }
    )
  }
  if (result.status === "rate_limited") {
    return Response.json(
      { error: "Please wait a little before submitting again." },
      { status: 429 }
    )
  }

  const notification = [
    result.parentName
      ? `New reply to ${result.parentName} on “${rant.title}”`
      : `New Perspective on “${rant.title}”`,
    `From: ${displayName}`,
    body,
    autoApproved
      ? `AI moderation: published automatically. ${moderation.reason}`
      : `AI moderation: needs your review. ${moderation.reason}`,
  ].join("\n\n")

  if (autoApproved) {
    await refreshRant(rantId)
    await publishRantsChanged(rantId)
    await sendRantsTelegramMessage(notification)
  } else {
    await sendRantsTelegramMessage(notification, {
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
    })
  }

  return Response.json({
    ok: true,
    id: result.id,
    name: displayName,
    published: autoApproved,
  })
}

export async function GET(request: Request) {
  const sync = await authenticatedSync(request)
  if (!sync) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const rantId = new URL(request.url).searchParams.get("rantId")?.trim()
  if (!rantId) {
    return Response.json({ error: "Rant ID is required." }, { status: 400 })
  }
  const ownedIds = await listOwnedPerspectiveIds(rantId, submitterHash(sync.id))
  const hasContributed = await hasPerspectiveContribution(
    rantId,
    submitterHash(sync.id)
  )
  return Response.json(
    { ownedIds, hasContributed, isAdmin: isAdminSync(sync.id) },
    { headers: { "Cache-Control": "private, no-store" } }
  )
}

export async function PATCH(request: Request) {
  const sync = await authenticatedSync(request)
  if (!sync) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const input = (await request.json()) as { id?: string; body?: string }
  const id = input.id?.trim() ?? ""
  const body = input.body?.trim().replace(/\r\n/g, "\n").slice(0, 1200) ?? ""
  if (!id || !body) {
    return Response.json({ error: "A comment is required." }, { status: 400 })
  }
  const hash = submitterHash(sync.id)
  const existing = await getOwnedPerspectiveForEdit(id, hash)
  if (!existing) {
    return Response.json({ error: "Comment not found." }, { status: 404 })
  }
  const moderation = await moderatePerspectiveContent({
    rantTitle: existing.rant_title,
    body,
    kind: "edit",
  })
  if (moderation.decision === "auto_approve") {
    const rantId = await updateOwnedPerspective(id, body, hash)
    if (!rantId) {
      return Response.json({ error: "Comment not found." }, { status: 404 })
    }
    await refreshRant(rantId)
    await publishRantsChanged(rantId)
    return Response.json({ ok: true, body, published: true })
  }

  const rantId = await stageOwnedPerspectiveEdit(id, body, hash)
  if (!rantId) {
    return Response.json({ error: "Comment not found." }, { status: 404 })
  }
  await sendRantsTelegramMessage(
    [
      `Edited Perspective on “${existing.rant_title}”`,
      `From: ${existing.name}`,
      `Current: ${existing.body}`,
      `Proposed: ${body}`,
      `AI moderation: needs your review. ${moderation.reason}`,
    ].join("\n\n"),
    {
      inlineKeyboard: [
        [
          {
            text: "Approve edit",
            callbackData: `approve_edit:${id}`,
          },
          {
            text: "Reject edit",
            callbackData: `reject_edit:${id}`,
          },
        ],
      ],
    }
  )
  return Response.json({ ok: true, pendingReview: true })
}

export async function DELETE(request: Request) {
  const sync = await authenticatedSync(request)
  if (!sync) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }
  const input = (await request.json()) as { id?: string }
  const id = input.id?.trim() ?? ""
  if (!id) {
    return Response.json({ error: "Comment ID is required." }, { status: 400 })
  }
  const rantId = await deleteOwnedPerspective(
    id,
    submitterHash(sync.id),
    isAdminSync(sync.id)
  )
  if (!rantId) {
    return Response.json({ error: "Comment not found." }, { status: 404 })
  }
  await refreshRant(rantId)
  await publishRantsChanged(rantId)
  return Response.json({ ok: true })
}
