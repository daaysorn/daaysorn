"use client"

import Script from "next/script"
import { useEffect, useRef, useState, type FormEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

declare global {
  interface Window {
    onRantTurnstile?: (token: string) => void
  }
}

export function PerspectiveForm({ rantId }: { rantId: string }) {
  const formRef = useRef<HTMLFormElement>(null)
  const [token, setToken] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  )
  const [message, setMessage] = useState("")
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setStatus("sending")
    setMessage("")
    try {
      const response = await fetch("/api/rants/perspectives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rantId,
          name: form.get("name"),
          email: form.get("email"),
          body: form.get("body"),
          website: form.get("website"),
          turnstileToken: token,
        }),
      })
      const result = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(result.error || "Submission failed")
      formRef.current?.reset()
      setStatus("sent")
      setMessage("Thank you. Your Perspective will appear after review.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Please try again.")
    }
  }

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
      className="mt-5 grid gap-3"
      aria-label="Contribute a Perspective"
    >
      <div className="grid gap-3 xs:grid-cols-2">
        <Input
          name="name"
          required
          minLength={2}
          maxLength={60}
          placeholder="Name"
        />
        <Input
          name="email"
          type="email"
          maxLength={160}
          placeholder="Email (private)"
        />
      </div>
      <textarea
        name="body"
        required
        minLength={20}
        maxLength={1200}
        rows={5}
        placeholder="Add your perspective"
        className="min-h-28 w-full min-w-0 resize-y rounded-md border border-input bg-transparent px-2.5 py-2 text-base shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm dark:bg-input/30"
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
            className="cf-turnstile"
            data-sitekey={siteKey}
            data-callback="onRantTurnstile"
            data-theme="auto"
          />
        </>
      ) : null}
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={status === "sending"}>
          {status === "sending" ? "Sending…" : "Contribute"}
        </Button>
        {message ? (
          <p
            className={
              status === "error"
                ? "text-sm text-destructive"
                : "text-sm text-muted-foreground"
            }
            role="status"
          >
            {message}
          </p>
        ) : null}
      </div>
    </form>
  )
}
