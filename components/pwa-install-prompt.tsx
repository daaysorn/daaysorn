"use client"

import Image from "next/image"
import { useCallback, useEffect, useRef, useState } from "react"
import {
  PiCheckBold,
  PiDownloadSimpleFill,
  PiShareFatFill,
  PiXBold,
} from "react-icons/pi"

import { Button } from "@/components/ui/button"
import { trackAnalyticsEvent } from "@/lib/analytics"

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

type InstallWindow = Window & {
  __daaysornInstallPrompt?: InstallPromptEvent | null
}

function isInstalled() {
  const standaloneNavigator = navigator as Navigator & {
    standalone?: boolean
  }
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    standaloneNavigator.standalone === true
  )
}

function isIosBrowser() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  )
}

export function PWAInstallPrompt() {
  const installTrackedRef = useRef(false)
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null
  )
  const [showIosInstall, setShowIosInstall] = useState(false)
  const [showIosSteps, setShowIosSteps] = useState(false)

  const readInstallPrompt = useCallback(() => {
    if (isInstalled()) return
    const prompt = (window as InstallWindow).__daaysornInstallPrompt
    if (prompt) setInstallPrompt(prompt)
  }, [])

  useEffect(() => {
    queueMicrotask(readInstallPrompt)
    if (!isInstalled() && isIosBrowser()) {
      queueMicrotask(() => setShowIosInstall(true))
    }

    const installed = () => {
      if (!installTrackedRef.current) {
        installTrackedRef.current = true
        trackAnalyticsEvent("pwa", "pwa_install", { outcome: "installed" })
      }
      setInstallPrompt(null)
      setShowIosInstall(false)
    }
    window.addEventListener("daaysorn:installable", readInstallPrompt)
    window.addEventListener("daaysorn:installed", installed)
    window.addEventListener("appinstalled", installed)

    return () => {
      window.removeEventListener("daaysorn:installable", readInstallPrompt)
      window.removeEventListener("daaysorn:installed", installed)
      window.removeEventListener("appinstalled", installed)
    }
  }, [readInstallPrompt])

  const dismiss = () => {
    trackAnalyticsEvent("pwa", "pwa_install_prompt", {
      action: "dismiss",
      platform: showIosInstall ? "ios" : "other",
    })
    setInstallPrompt(null)
    setShowIosInstall(false)
  }

  const install = async () => {
    if (!installPrompt) return

    try {
      await installPrompt.prompt()
      const choice = await installPrompt.userChoice
      trackAnalyticsEvent("pwa", "pwa_install_prompt", {
        action: choice.outcome,
        platform: "chromium",
      })
    } finally {
      ;(window as InstallWindow).__daaysornInstallPrompt = null
      setInstallPrompt(null)
    }
  }

  if (!installPrompt && !showIosInstall) return null

  return (
    <aside
      role="status"
      aria-label="Install daaysorn"
      className="fixed inset-x-4 bottom-[calc(max(1rem,env(safe-area-inset-bottom))+5.5rem)] z-[70] mx-auto flex max-w-sm items-center gap-3 rounded-2xl border border-border bg-popover/88 p-3 text-popover-foreground shadow-2xl backdrop-blur-2xl md:bottom-20"
    >
      <span className="relative size-9 shrink-0 overflow-hidden rounded-xl bg-muted">
        <Image
          src="/icons/pwa-96.png"
          alt=""
          fill
          sizes="2.25rem"
          className="object-contain p-0.5"
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-heading text-sm font-semibold">Install daaysorn</p>
        {showIosInstall && showIosSteps ? (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Tap <PiShareFatFill className="inline text-primary" aria-hidden />{" "}
            in your browser, then choose{" "}
            <span className="font-medium text-foreground">
              Add to Home Screen
            </span>
            .
          </p>
        ) : (
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            Keep daaysorn close, even when you&apos;re offline.
          </p>
        )}
      </div>
      {showIosInstall ? (
        <Button
          type="button"
          size="sm"
          onClick={() => {
            trackAnalyticsEvent("pwa", "pwa_install_prompt", {
              action: showIosSteps
                ? "instructions_closed"
                : "instructions_opened",
              platform: "ios",
            })
            setShowIosSteps((visible) => !visible)
          }}
          aria-expanded={showIosSteps}
        >
          {showIosSteps ? (
            <PiCheckBold className="text-current" aria-hidden />
          ) : (
            <PiDownloadSimpleFill className="text-current" aria-hidden />
          )}
          {showIosSteps ? "Got it" : "Install"}
        </Button>
      ) : (
        <Button type="button" size="sm" onClick={() => void install()}>
          <PiDownloadSimpleFill className="text-current" aria-hidden />
          Install
        </Button>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        aria-label="Dismiss install prompt"
        onClick={dismiss}
        className="rounded-full"
      >
        <PiXBold />
      </Button>
    </aside>
  )
}
