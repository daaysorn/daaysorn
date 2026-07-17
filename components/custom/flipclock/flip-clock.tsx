"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { FlipUnit } from "./flip-unit"

interface Time {
  h: string
  m: string
  s: string
}

/**
 * Reads the current time as HH:MM:SS. Defaults to the viewer's own timezone
 * (via Intl — no geolocation prompt), reflecting their location; pass an IANA
 * `timeZone` (e.g. "Europe/London") to pin it.
 */
function useClock(timeZone?: string): Time | null {
  const [time, setTime] = React.useState<Time | null>(null)

  React.useEffect(() => {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })

    const tick = () => {
      const parts = fmt.formatToParts(new Date())
      const get = (t: Intl.DateTimeFormatPartTypes) =>
        parts.find((p) => p.type === t)?.value ?? "00"
      setTime({ h: get("hour"), m: get("minute"), s: get("second") })
    }

    tick()
    // Poll faster than 1s so a second rollover flips promptly without drift.
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [timeZone])

  return time
}

export function FlipClock({
  timeZone,
  className,
}: {
  timeZone?: string
  className?: string
}) {
  const time = useClock(timeZone)

  // Render nothing time-specific on the server to avoid hydration mismatch.
  if (!time) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-block h-[1.3rem] w-[6.2rem] animate-pulse rounded bg-muted align-middle",
          className,
        )}
      />
    )
  }

  return (
    <span
      role="timer"
      aria-label={`${time.h}:${time.m}:${time.s}`}
      className={cn(
        // Muted + text-sm to sit alongside the copyright text.
        "inline-flex items-center gap-[0.12rem] align-middle font-mono text-sm leading-none text-muted-foreground [--fc-h:1.3rem] [--fc-w:0.85rem]",
        className,
      )}
    >
      <Pair value={time.h} />
      <Separator />
      <Pair value={time.m} />
      <Separator />
      <Pair value={time.s} />
    </span>
  )
}

function Pair({ value }: { value: string }) {
  return (
    <span className="inline-flex gap-[0.1rem]">
      <FlipUnit digit={value[0]} />
      <FlipUnit digit={value[1]} />
    </span>
  )
}

function Separator() {
  return (
    <span aria-hidden className="px-[0.05rem] text-muted-foreground">
      :
    </span>
  )
}
