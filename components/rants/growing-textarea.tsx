"use client"

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type TextareaHTMLAttributes,
} from "react"

import { cn } from "@/lib/utils"

type GrowingTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange" | "value" | "rows" | "placeholder"
> & {
  value: string
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onSubmitShortcut?: () => void
}

export function GrowingTextarea({
  value,
  onChange,
  onSubmitShortcut,
  className,
  ...props
}: GrowingTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [isMac, setIsMac] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    if (!value) {
      textarea.style.height = ""
      return
    }
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`
  }, [value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onSubmitShortcut?.()
    }
  }

  const shortcut = isMac ? "⌘ Enter" : "Ctrl Enter"
  const guidance = `${shortcut} to send · Shift Enter for a new line`

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={guidance}
      className={cn("max-h-40 min-h-12 resize-none overflow-y-auto", className)}
    />
  )
}
