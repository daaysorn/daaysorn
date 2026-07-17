import { readdir } from "node:fs/promises"
import { join } from "node:path"
import type { MetadataRoute } from "next"

import { siteConfig } from "@/lib/seo"

const pageFilePattern = /^page\.(?:[cm]?[jt]sx?)$/

function isRouteGroup(segment: string) {
  return segment.startsWith("(") && segment.endsWith(")")
}

function shouldSkipDirectory(segment: string) {
  return (
    segment === "api" ||
    segment.startsWith("_") ||
    segment.startsWith("@") ||
    segment.includes("[")
  )
}

async function discoverStaticRoutes(
  directory: string,
  segments: string[] = []
): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true })
  const routes: string[] = []

  if (
    entries.some((entry) => entry.isFile() && pageFilePattern.test(entry.name))
  ) {
    routes.push(segments.length === 0 ? "/" : `/${segments.join("/")}`)
  }

  for (const entry of entries) {
    if (!entry.isDirectory() || shouldSkipDirectory(entry.name)) continue

    const nextSegments = isRouteGroup(entry.name)
      ? segments
      : [...segments, entry.name]

    routes.push(
      ...(await discoverStaticRoutes(join(directory, entry.name), nextSegments))
    )
  }

  return routes
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes = await discoverStaticRoutes(join(process.cwd(), "app"))

  return [...new Set(routes)].sort().map((route) => ({
    url: new URL(route, siteConfig.url).toString(),
    changeFrequency: route === "/" ? "monthly" : "weekly",
    priority: route === "/" ? 1 : 0.7,
  }))
}
