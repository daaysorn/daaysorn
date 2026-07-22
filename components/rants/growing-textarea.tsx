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
  "onChange" | "value" | "rows"
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
  const [maxHeight, setMaxHeight] = useState(160)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsMac(/Mac|iPhone|iPad|iPod/i.test(navigator.platform))
    })
    return () => window.cancelAnimationFrame(frame)
  }, [])

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const update = () => setMaxHeight(media.matches ? 240 : 160)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    const textarea = ref.current
    if (!textarea) return
    if (!value) {
      textarea.style.height = ""
      return
    }
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, maxHeight)}px`
  }, [maxHeight, value])

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    props.onKeyDown?.(event)
    if (event.defaultPrevented) return
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      onSubmitShortcut?.()
    }
  }

  const shortcut = isMac ? "⌘ + Enter" : "Ctrl + Enter"

  return (
    <textarea
      {...props}
      ref={ref}
      rows={1}
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      aria-keyshortcuts={`${shortcut}, Shift+Enter`}
      className={cn("min-h-12 resize-none overflow-y-hidden", className)}
    />
  )
}
