"use client"

import Script from "next/script"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
    onRantTurnstile?: (token: string) => void
    turnstile?: { reset: () => void }
  }
}

function initials(name: string) {
  if (!name) return "?"
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
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

export function PerspectiveForm({ rantId }: { rantId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
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
          name: form.get("name"),
          body: form.get("body"),
          website: form.get("website"),
          turnstileToken: token,
        }),
      })
      const result = (await response.json()) as {
        error?: string
        name?: string
      }
      if (!response.ok) throw new Error(result.error || "Submission failed")
      const resolvedName = result.name ?? displayName
      if (resolvedName) {
        window.localStorage.setItem(deviceNameStorageKey, resolvedName)
        setDisplayName(resolvedName)
      }
      formRef.current?.reset()
      setBody("")
      setToken("")
      window.turnstile?.reset()
      setStatus("sent")
      setMessage("Thank you. Your Perspective will appear after review.")
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

  useEffect(() => {
    if (!siteKey) return
    window.onRantTurnstile = setToken
    return () => {
      delete window.onRantTurnstile
    }
  }, [siteKey])

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className="mt-5 grid gap-3 border-y border-border bg-muted/20 py-4 xs:gap-4 xs:py-5"
      aria-label="Contribute a Perspective"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          aria-hidden="true"
          className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-xs font-medium text-muted-foreground"
        >
          {initials(displayName)}
        </span>
        {displayName ? (
          <p className="min-w-0 text-sm">
            <span className="text-muted-foreground">Replying as </span>
            <span className="font-medium text-foreground">{displayName}</span>
          </p>
        ) : (
          <Input
            name="name"
            maxLength={60}
            placeholder="Name (optional)"
            aria-label="Name, optional"
            className="h-8 max-w-56 bg-background/40"
          />
        )}
      </div>
      {!displayName ? (
        <p className="text-xs text-muted-foreground">
          Leave your name blank for a private name that stays with your synced
          identity.
        </p>
      ) : null}
      <label htmlFor={`perspective-${rantId}`} className="sr-only">
        Reply to this Rant
      </label>
      <textarea
        id={`perspective-${rantId}`}
        name="body"
        required
        minLength={1}
        maxLength={1200}
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="What would you add?"
        className="min-h-20 w-full min-w-0 resize-y rounded-md border border-input bg-background/40 px-2.5 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {siteKey && body.trim() ? (
        <>
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="lazyOnload"
          />
          <div
            className="cf-turnstile opacity-80"
            data-sitekey={siteKey}
            data-callback="onRantTurnstile"
            data-theme="auto"
          />
        </>
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          {siteKey
            ? body.trim()
              ? token
                ? "Human check complete"
                : "Complete the human check to post"
              : "Human check appears after you start typing"
            : "Your synced identity stays private"}
        </p>
        <Button type="submit" size="sm" disabled={!canContinue}>
          {status === "sending" ? "Posting…" : "Post Perspective"}
        </Button>
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
      </div>
    </form>
  )
}
