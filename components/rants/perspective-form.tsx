"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { PiPaperPlaneTiltFill, PiSpinnerGapBold } from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { PerspectiveAvatar } from "@/components/rants/perspective-avatar"
import { GrowingTextarea } from "@/components/rants/growing-textarea"
import { trackAnalyticsEvent } from "@/lib/analytics"
import {
  deviceNameStorageKey,
  favouritesStorageKey,
  readDeviceSyncSession,
  syncSessionStorageKey,
  type DeviceSyncSession,
} from "@/lib/device-sync"
import { cn } from "@/lib/utils"

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          theme: "auto"
          size: "flexible"
          appearance: "interaction-only"
          callback: (token: string) => void
        }
      ) => string
      remove: (widgetId: string) => void
    }
  }
}

function savedKeepIds() {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(favouritesStorageKey) ?? "[]"
    ) as unknown
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : []
  } catch {
    return []
  }
}

async function ensureDeviceSession() {
  const existing = readDeviceSyncSession()
  if (existing) return existing

  const response = await fetch("/api/keeps/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ savedIds: savedKeepIds() }),
  })
  if (!response.ok)
    throw new Error("Your device identity could not be created.")
  const session = (await response.json()) as DeviceSyncSession & {
    displayName?: string
  }
  window.localStorage.setItem(syncSessionStorageKey, JSON.stringify(session))
  if (session.displayName) {
    window.localStorage.setItem(deviceNameStorageKey, session.displayName)
  }
  return session
}

export function PerspectiveForm({
  rantId,
  parentId = null,
  onSubmitted,
}: {
  rantId: string
  parentId?: string | null
  onSubmitted?: (id: string) => void
}) {
  const formRef = useRef<HTMLFormElement>(null)
  const turnstileRef = useRef<HTMLDivElement>(null)
  const [token, setToken] = useState("")
  const [body, setBody] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [identityReady, setIdentityReady] = useState(false)
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [message, setMessage] = useState("")
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()
  const canContinue =
    identityReady &&
    Boolean(body.trim()) &&
    status !== "sending" &&
    (!siteKey || Boolean(token))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canContinue) return
    const form = new FormData(event.currentTarget)
    setStatus("sending")
    setMessage("")
    try {
      const session = await ensureDeviceSession()
      const response = await fetch("/api/rants/perspectives", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.id}.${session.secret}`,
        },
        body: JSON.stringify({
          rantId,
          parentId,
          name: form.get("name"),
          body: form.get("body"),
          website: form.get("website"),
          turnstileToken: token,
        }),
      })
      const result = (await response.json()) as {
        error?: string
        id?: string
        name?: string
        published?: boolean
      }
      if (!response.ok) throw new Error(result.error || "Submission failed")
      if (result.id) onSubmitted?.(result.id)
      const resolvedName = result.name ?? displayName
      if (resolvedName) {
        window.localStorage.setItem(deviceNameStorageKey, resolvedName)
        setDisplayName(resolvedName)
      }
      formRef.current?.reset()
      setBody("")
      setToken("")
      setStatus("sent")
      setMessage(
        result.published
          ? parentId
            ? "Your reply is live."
            : "Your Perspective is live."
          : parentId
            ? "Your reply was sent for further review."
            : "Your Perspective was sent for further review."
      )
      trackAnalyticsEvent("rants", "perspective_submit", {
        outcome: "success",
      })
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Please try again.")
      trackAnalyticsEvent("rants", "perspective_submit", {
        outcome: "error",
      })
    }
  }

  useEffect(() => {
    const localName = window.localStorage.getItem(deviceNameStorageKey) ?? ""
    const session = readDeviceSyncSession()

    const loadIdentity = async () => {
      try {
        await Promise.resolve()
        if (localName) setDisplayName(localName)
        if (session && !localName) {
          const response = await fetch("/api/keeps/sync", {
            headers: {
              Authorization: `Bearer ${session.id}.${session.secret}`,
            },
          })
          if (response.ok) {
            const result = (await response.json()) as { displayName?: string }
            if (result.displayName) {
              window.localStorage.setItem(
                deviceNameStorageKey,
                result.displayName
              )
              setDisplayName(result.displayName)
            }
          }
        }
      } catch {
        setMessage("Device sync is temporarily unavailable.")
        setStatus("error")
      } finally {
        setIdentityReady(true)
      }
    }
    void loadIdentity()
  }, [])

  const hasBody = Boolean(body.trim())

  useEffect(() => {
    if (!siteKey || !hasBody || !turnstileRef.current) return
    const scriptId = "daaysorn-turnstile-script"
    const scriptSource =
      "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    let script = document.getElementById(scriptId) as HTMLScriptElement | null
    let widgetId: string | null = null
    let cancelled = false

    const renderWidget = () => {
      if (cancelled || !turnstileRef.current || !window.turnstile) return
      widgetId = window.turnstile.render(turnstileRef.current, {
        sitekey: siteKey,
        theme: "auto",
        size: "flexible",
        appearance: "interaction-only",
        callback: setToken,
      })
    }

    if (window.turnstile) {
      renderWidget()
    } else if (script) {
      script.addEventListener("load", renderWidget, { once: true })
    } else {
      script = document.createElement("script")
      script.id = scriptId
      script.src = scriptSource
      script.async = true
      script.defer = true
      script.addEventListener("load", renderWidget, { once: true })
      document.head.appendChild(script)
    }

    return () => {
      cancelled = true
      script?.removeEventListener("load", renderWidget)
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId)
    }
  }, [hasBody, siteKey])

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-7 grid min-w-0 gap-3 pb-6"
      aria-label="Contribute a Perspective"
    >
      <div className="flex min-w-0 items-start gap-3">
        <PerspectiveAvatar seed={displayName || "new daaysorn reader"} />
        {displayName ? (
          <p className="min-w-0 pt-1 text-sm">
            <span className="text-muted-foreground">Reply as </span>
            <span className="font-medium text-foreground">{displayName}</span>
          </p>
        ) : (
          <div className="grid gap-1.5">
            <Input
              name="name"
              maxLength={60}
              placeholder="Name (optional)"
              aria-label="Name, optional"
              className="h-8 max-w-56 bg-transparent"
            />
            <p className="text-xs text-muted-foreground">Anon if blank.</p>
          </div>
        )}
      </div>
      <label htmlFor={`perspective-${rantId}`} className="sr-only">
        Reply to this Rant
      </label>
      <div className="relative min-w-0">
        <GrowingTextarea
          id={`perspective-${rantId}`}
          name="body"
          required
          minLength={1}
          maxLength={1200}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onSubmitShortcut={() => formRef.current?.requestSubmit()}
          placeholder="No perspectives yet, you can be the first."
          className="w-full min-w-0 rounded-xl border border-input bg-muted/40 px-3 pt-3 pr-14 pb-14 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <Button
          type="submit"
          size="icon-sm"
          disabled={!canContinue}
          aria-label={status === "sending" ? "Posting reply" : "Send reply"}
          title={status === "sending" ? "Posting…" : "Send reply"}
          className="absolute right-3 bottom-4 rounded-full"
        >
          {status === "sending" ? (
            <PiSpinnerGapBold className="animate-spin" aria-hidden="true" />
          ) : (
            <PiPaperPlaneTiltFill aria-hidden="true" />
          )}
        </Button>
      </div>
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {siteKey ? (
        <div
          ref={turnstileRef}
          className={cn(
            "w-full min-w-0 overflow-hidden opacity-80",
            !hasBody && "hidden"
          )}
        />
      ) : null}
      {message ? (
        <p
          className={cn(
            "w-full text-sm",
            status === "error" ? "text-destructive" : "text-muted-foreground"
          )}
          role="status"
        >
          {message}
        </p>
      ) : null}
    </form>
  )
}
