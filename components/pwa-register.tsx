"use client"

import { useEffect } from "react"

type InstallPromptEvent = Event & { preventDefault: () => void }
type ExtendedRegistration = ServiceWorkerRegistration & {
  periodicSync?: {
    register: (tag: string, options: { minInterval: number }) => Promise<void>
  }
  sync?: { register: (tag: string) => Promise<void> }
}

declare global {
  interface Window {
    __daaysornInstallPrompt?: Event | null
  }
}

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    if (process.env.NODE_ENV !== "production") {
      const cleanup = async () => {
        const registrations = await navigator.serviceWorker.getRegistrations()
        await Promise.all(
          registrations.map((registration) => registration.unregister())
        )
        if ("caches" in window) {
          const keys = await caches.keys()
          await Promise.all(
            keys
              .filter((key) => key.startsWith("daaysorn-"))
              .map((key) => caches.delete(key))
          )
        }
        if (
          navigator.serviceWorker.controller &&
          !sessionStorage.getItem("daaysorn-dev-sw-cleared")
        ) {
          sessionStorage.setItem("daaysorn-dev-sw-cleared", "true")
          window.location.reload()
        }
      }
      void cleanup()
      return
    }

    const beforeInstall = (event: Event) => {
      const prompt = event as InstallPromptEvent
      prompt.preventDefault()
      window.__daaysornInstallPrompt = prompt
      window.dispatchEvent(new Event("daaysorn:installable"))
    }
    const installed = () => {
      window.__daaysornInstallPrompt = null
      window.dispatchEvent(new Event("daaysorn:installed"))
    }
    let refreshing = false
    const controllerChanged = () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    }

    window.addEventListener("beforeinstallprompt", beforeInstall)
    window.addEventListener("appinstalled", installed)
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      controllerChanged
    )

    const register = async () => {
      try {
        const registration = (await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        })) as ExtendedRegistration
        await registration.update()
        try {
          await registration.periodicSync?.register(
            "daaysorn-daily-content-refresh",
            { minInterval: 24 * 60 * 60 * 1000 }
          )
        } catch {
          // The browser may withhold periodic sync.
        }

        const requestRecoverySync = async () => {
          try {
            await registration.sync?.register(
              "daaysorn-refresh-offline-content"
            )
          } catch {
            // Online and focus refresh remain the fallback.
          }
        }
        if (!navigator.onLine) {
          window.addEventListener("online", requestRecoverySync, { once: true })
        }
        window.addEventListener(
          "offline",
          () =>
            window.addEventListener("online", requestRecoverySync, {
              once: true,
            }),
          { passive: true, once: true }
        )
      } catch (error) {
        console.error("Service worker registration failed", error)
      }
    }
    void register()

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstall)
      window.removeEventListener("appinstalled", installed)
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        controllerChanged
      )
    }
  }, [])

  return null
}
