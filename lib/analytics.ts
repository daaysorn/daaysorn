"use client"

import { sendGAEvent } from "@next/third-parties/google"

type AnalyticsValue = string | number | boolean

export function trackAnalyticsEvent(
  feature: string,
  eventName: string,
  parameters: Record<string, AnalyticsValue> = {}
) {
  if (typeof window === "undefined") return

  const analyticsWindow = window as typeof window & { dataLayer?: unknown[] }
  analyticsWindow.dataLayer ??= []
  sendGAEvent("event", eventName, {
    feature,
    ...parameters,
  })
}

export function trackKeepsEvent(
  eventName: string,
  parameters: Record<string, AnalyticsValue> = {}
) {
  trackAnalyticsEvent("keeps", eventName, parameters)
}
