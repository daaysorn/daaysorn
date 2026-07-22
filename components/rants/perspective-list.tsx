"use client"

import { useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  PiArrowBendUpLeftFill,
  PiCheckCircleFill,
  PiPencilSimpleFill,
  PiSpinnerGapBold,
  PiTrashFill,
  PiXCircleFill,
} from "react-icons/pi"

import { PerspectiveAvatar } from "@/components/rants/perspective-avatar"
import { PerspectiveForm } from "@/components/rants/perspective-form"
import { GrowingTextarea } from "@/components/rants/growing-textarea"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  readDeviceSyncSession,
  type DeviceSyncSession,
} from "@/lib/device-sync"
import type { Perspective } from "@/lib/rants/types"
import { cn } from "@/lib/utils"

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-NG", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value))
}

function authorization(session: DeviceSyncSession) {
  return { Authorization: `Bearer ${session.id}.${session.secret}` }
}

function idsInThread(items: Perspective[], rootId: string) {
  const ids = new Set([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id)
        changed = true
      }
    }
  }
  return ids
}

function IconTooltip({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  )
}

export function PerspectiveList({
  rantId,
  perspectives: initialPerspectives,
}: {
  rantId: string
  perspectives: Perspective[]
}) {
  const router = useRouter()
  const [perspectives, setPerspectives] = useState(initialPerspectives)
  const [ownedIds, setOwnedIds] = useState<Set<string>>(new Set())
  const [isAdmin, setIsAdmin] = useState(false)
  const [hasContributed, setHasContributed] = useState(false)
  const [ownershipReady, setOwnershipReady] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [draft, setDraft] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState("")
  const [feedback, setFeedback] = useState("")

  useEffect(() => {
    const session = readDeviceSyncSession()
    if (!session) {
      void Promise.resolve().then(() => setOwnershipReady(true))
      return
    }
    const controller = new AbortController()

    void fetch(`/api/rants/perspectives?rantId=${encodeURIComponent(rantId)}`, {
      headers: authorization(session),
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return
        const result = (await response.json()) as {
          ownedIds?: string[]
          isAdmin?: boolean
          hasContributed?: boolean
        }
        setOwnedIds(new Set(result.ownedIds ?? []))
        setIsAdmin(result.isAdmin === true)
        setHasContributed(result.hasContributed === true)
      })
      .catch(() => undefined)
      .finally(() => setOwnershipReady(true))

    return () => controller.abort()
  }, [initialPerspectives, rantId])

  useEffect(() => {
    let realtime: import("ably").Realtime | undefined
    let channel: import("ably").RealtimeChannel | undefined
    let cancelled = false
    const receiveChange = (message: import("ably").Message) => {
      const data = message.data as { rantId?: string } | undefined
      if (!data?.rantId || data.rantId === rantId) router.refresh()
    }

    const connect = async () => {
      try {
        const Ably = await import("ably")
        if (cancelled) return
        realtime = new Ably.Realtime({
          authUrl: "/api/rants/realtime-token",
          authMethod: "GET",
        })
        channel = realtime.channels.get("public:rants")
        await channel.subscribe("changed", receiveChange)
      } catch {
        // Page revalidation still provides the updated thread on refresh.
      }
    }

    void connect()
    return () => {
      cancelled = true
      channel?.unsubscribe("changed", receiveChange)
      realtime?.close()
    }
  }, [rantId, router])

  const save = async (id: string) => {
    const body = draft.trim()
    const session = readDeviceSyncSession()
    if (!body || !session) return
    setBusyId(id)
    setError("")
    setFeedback("")
    try {
      const response = await fetch("/api/rants/perspectives", {
        method: "PATCH",
        headers: {
          ...authorization(session),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, body }),
      })
      const result = (await response.json()) as {
        error?: string
        pendingReview?: boolean
      }
      if (!response.ok) throw new Error(result.error || "Update failed.")
      if (result.pendingReview) {
        setFeedback("Your edit was sent for further review.")
      } else {
        setPerspectives((items) =>
          items.map((item) => (item.id === id ? { ...item, body } : item))
        )
      }
      setEditingId(null)
      setDraft("")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  const remove = async (id: string) => {
    const session = readDeviceSyncSession()
    if (!session) return
    const removedPerspective = perspectives.find((item) => item.id === id)
    setBusyId(id)
    setError("")
    setFeedback("")
    try {
      const response = await fetch("/api/rants/perspectives", {
        method: "DELETE",
        headers: {
          ...authorization(session),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || "Delete failed.")
      setPerspectives((items) => {
        const removedIds = idsInThread(items, id)
        return items.filter((item) => !removedIds.has(item.id))
      })
      setOwnedIds((items) => {
        const next = new Set(items)
        next.delete(id)
        return next
      })
      if (!removedPerspective?.parentId && ownedIds.has(id)) {
        setHasContributed(
          perspectives.some(
            (item) => item.id !== id && !item.parentId && ownedIds.has(item.id)
          )
        )
      }
      setDeletingId(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Please try again.")
    } finally {
      setBusyId(null)
    }
  }

  const rememberOwnership = (id: string) => {
    setOwnedIds((current) => new Set(current).add(id))
  }

  const rememberRootSubmission = (id: string) => {
    rememberOwnership(id)
    setHasContributed(true)
  }

  const renderPerspective = (perspective: Perspective, depth = 0) => {
    const owned = ownedIds.has(perspective.id)
    const canDelete = owned || isAdmin
    const editing = editingId === perspective.id
    const confirmingDelete = deletingId === perspective.id
    const replies = perspectives.filter(
      (item) => item.parentId === perspective.id
    )

    return (
      <div
        key={perspective.id}
        className={
          depth > 0
            ? "ml-3 border-l border-border pl-3 xs:ml-5 xs:pl-4"
            : undefined
        }
      >
        <article
          className={cn(
            "grid min-w-0 grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2 py-5 xs:grid-cols-[2rem_minmax(0,1fr)] xs:gap-x-3",
            busyId === perspective.id &&
              deletingId === perspective.id &&
              "opacity-60 motion-safe:animate-pulse"
          )}
        >
          <PerspectiveAvatar seed={perspective.name} />
          <div className="min-w-0">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground">
                {perspective.name}
              </p>
              <time className="mt-0.5 block font-mono text-[0.625rem] leading-4 text-muted-foreground">
                {formatDate(perspective.createdAt)}
              </time>
            </div>

            {editing ? (
              <div className="relative mt-3 min-w-0">
                <GrowingTextarea
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  maxLength={1200}
                  aria-label="Edit comment"
                  onSubmitShortcut={() => void save(perspective.id)}
                  className="w-full min-w-0 rounded-xl border border-input bg-muted/40 px-3 pt-3 pr-20 pb-10 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
                />
                <div className="absolute right-2 bottom-2 flex gap-1">
                  <IconTooltip label="Cancel edit">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Cancel edit"
                      className="text-success hover:text-success"
                      onClick={() => setEditingId(null)}
                    >
                      <PiXCircleFill aria-hidden="true" />
                    </Button>
                  </IconTooltip>
                  <IconTooltip label="Save edit">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      aria-label="Save edit"
                      className="text-destructive hover:text-destructive"
                      disabled={!draft.trim() || busyId === perspective.id}
                      onClick={() => void save(perspective.id)}
                    >
                      {busyId === perspective.id ? (
                        <PiSpinnerGapBold
                          className="animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <PiCheckCircleFill aria-hidden="true" />
                      )}
                    </Button>
                  </IconTooltip>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-7 whitespace-pre-wrap text-muted-foreground">
                {perspective.body}
              </p>
            )}

            {!editing ? (
              <div className="mt-2 flex items-center gap-1">
                <IconTooltip label="Reply">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`Reply to ${perspective.name}`}
                    onClick={() =>
                      setReplyingToId((current) =>
                        current === perspective.id ? null : perspective.id
                      )
                    }
                  >
                    <PiArrowBendUpLeftFill aria-hidden="true" />
                  </Button>
                </IconTooltip>
                {canDelete ? (
                  confirmingDelete ? (
                    <>
                      <IconTooltip label="Confirm delete">
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon-xs"
                          aria-label="Confirm delete"
                          disabled={busyId === perspective.id}
                          onClick={() => void remove(perspective.id)}
                        >
                          {busyId === perspective.id ? (
                            <PiSpinnerGapBold
                              className="animate-spin"
                              aria-hidden="true"
                            />
                          ) : (
                            <PiCheckCircleFill aria-hidden="true" />
                          )}
                        </Button>
                      </IconTooltip>
                      <IconTooltip label="Cancel delete">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Cancel delete"
                          className="text-success hover:text-success"
                          onClick={() => setDeletingId(null)}
                        >
                          <PiXCircleFill aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                    </>
                  ) : (
                    <>
                      {owned ? (
                        <IconTooltip label="Edit">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="Edit comment"
                            onClick={() => {
                              setEditingId(perspective.id)
                              setDeletingId(null)
                              setDraft(perspective.body)
                            }}
                          >
                            <PiPencilSimpleFill aria-hidden="true" />
                          </Button>
                        </IconTooltip>
                      ) : null}
                      <IconTooltip label="Delete">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-xs"
                          aria-label="Delete comment"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(perspective.id)}
                        >
                          <PiTrashFill aria-hidden="true" />
                        </Button>
                      </IconTooltip>
                    </>
                  )
                ) : null}
              </div>
            ) : null}

            {replyingToId === perspective.id ? (
              <PerspectiveForm
                rantId={rantId}
                parentId={perspective.id}
                onSubmitted={rememberOwnership}
              />
            ) : null}
          </div>
        </article>
        {replies.map((reply) => renderPerspective(reply, depth + 1))}
      </div>
    )
  }

  const roots = perspectives.filter((perspective) => !perspective.parentId)

  return (
    <TooltipProvider delayDuration={150} skipDelayDuration={100}>
      <div className="mt-5 min-w-0 divide-y divide-border">
        {roots.length
          ? roots.map((perspective) => renderPerspective(perspective))
          : null}
        {error ? (
          <p className="py-3 text-sm text-destructive" role="status">
            {error}
          </p>
        ) : null}
        {feedback ? (
          <p className="py-3 text-sm text-muted-foreground" role="status">
            {feedback}
          </p>
        ) : null}
        {ownershipReady && !hasContributed ? (
          <PerspectiveForm
            rantId={rantId}
            onSubmitted={rememberRootSubmission}
          />
        ) : null}
      </div>
    </TooltipProvider>
  )
}
