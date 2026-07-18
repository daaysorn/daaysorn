"use client"

import { sendGAEvent } from "@next/third-parties/google"

type AnalyticsValue = string | number | boolean

export function trackKeepsEvent(
  eventName: string,
  parameters: Record<string, AnalyticsValue> = {}
) {
  const analyticsWindow = window as typeof window & { dataLayer?: unknown[] }
  analyticsWindow.dataLayer ??= []
  sendGAEvent("event", eventName, {
    feature: "keeps",
    ...parameters,
  })
}
