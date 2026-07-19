"use client"

import Script from "next/script"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
      setStatus("sent")
      setMessage("Thank you. Your Perspective will appear after review.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Please try again.")
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
      className="mt-5 grid gap-3 rounded-xl border border-border bg-muted/30 p-4 xs:p-5"
      aria-label="Contribute a Perspective"
    >
      {displayName ? (
        <p className="text-sm text-muted-foreground">
          Posting as{" "}
          <span className="font-medium text-foreground">{displayName}</span>
        </p>
      ) : (
        <div className="grid gap-1.5">
          <Input
            name="name"
            maxLength={60}
            placeholder="Name (optional)"
            className="bg-background/50"
          />
          <p className="text-xs text-muted-foreground">
            Leave this blank and we’ll give you a private, reusable name.
          </p>
        </div>
      )}
      <textarea
        name="body"
        required
        minLength={1}
        maxLength={1200}
        rows={4}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Add your perspective"
        className="min-h-24 w-full min-w-0 resize-y rounded-md border border-input bg-background/50 px-2.5 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
      />
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      {siteKey ? (
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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="sm" disabled={!canContinue}>
          {status === "sending" ? "Sending…" : "Continue"}
        </Button>
        {message ? (
          <p
            className={cn(
              "text-sm",
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
