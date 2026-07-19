"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

/** Total flip duration must match the CSS (fold-top + delayed fold-bottom). */
const FLIP_MS = 560

/**
 * A single split-flap digit. When `digit` changes, the top flap folds down
 * (showing the old digit) while the bottom flap folds up (revealing the new
 * one) — the classic flip-clock motion. Sizing comes from the `--fc-h` /
 * `--fc-w` CSS variables set by the parent <FlipClock>.
 */
export function FlipUnit({ digit }: { digit: string }) {
  const [state, setState] = React.useState({
    current: digit,
    previous: digit,
    flipping: false,
  })

  if (state.current !== digit) {
    setState((s) =>
      s.current === digit
        ? s
        : { current: digit, previous: s.current, flipping: true }
    )
  }

  React.useEffect(() => {
    if (!state.flipping) return
    const t = setTimeout(
      () => setState((s) => ({ ...s, flipping: false })),
      FLIP_MS
    )
    return () => clearTimeout(t)
  }, [state.flipping])

  const { current, previous, flipping } = state
  // Bottom static half keeps showing the old digit until the flip completes.
  const bottomStatic = flipping ? previous : current

  return (
    <span
      aria-hidden
      className="relative inline-block h-(--fc-h) w-(--fc-w) rounded-[0.18em] bg-muted text-muted-foreground select-none perspective-[220px]"
    >
      <Half half="top">{current}</Half>
      <Half half="bottom">{bottomStatic}</Half>

      {flipping && (
        <>
          <Half half="top" className="z-10 animate-flip-top">
            {previous}
          </Half>
          <Half half="bottom" className="z-10 animate-flip-bottom">
            {current}
          </Half>
        </>
      )}

      {/* Center hinge line */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-1/2 z-20 h-px -translate-y-1/2 bg-background/50"
      />
    </span>
  )
}

function Half({
  half,
  className,
  children,
}: {
  half: "top" | "bottom"
  className?: string
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "absolute inset-x-0 flex h-1/2 overflow-hidden bg-muted",
        half === "top"
          ? "top-0 items-start rounded-t-[0.18em]"
          : "bottom-0 items-end rounded-b-[0.18em]",
        className
      )}
    >
      {/* A full-unit-height glyph clipped by the half window. items-start shows
          its top half; items-end shows its bottom half — together = one digit. */}
      <span className="block h-(--fc-h) w-full shrink-0 text-center leading-(--fc-h)">
        {children}
      </span>
    </span>
  )
}
