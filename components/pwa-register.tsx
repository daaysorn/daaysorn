"use client"

import { useEffect } from "react"

export function PWARegister() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    ) {
      return
    }

    let reloading = false
    const onControllerChange = () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    }

    const register = async () => {
      const registration = await navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      })
      await registration.update()
    }

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange
    )

    if (document.readyState === "complete") {
      void register()
    } else {
      window.addEventListener("load", register, { once: true })
    }

    return () => {
      window.removeEventListener("load", register)
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange
      )
    }
  }, [])

  return null
}
