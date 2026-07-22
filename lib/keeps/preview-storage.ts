import { createHash } from "node:crypto"
import sharp from "sharp"

import { r2Files, r2PublicBaseUrl } from "@/lib/files"

const maxPreviewBytes = 8 * 1024 * 1024

async function readImage(response: Response) {
  if (!response.ok)
    throw new Error(`Preview request returned ${response.status}`)
  if (!response.headers.get("content-type")?.startsWith("image/")) {
    throw new Error("Preview response is not an image")
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0)
  if (contentLength > maxPreviewBytes) throw new Error("Preview is too large")
  if (!response.body) throw new Error("Preview response has no body")

  const chunks: Uint8Array[] = []
  const reader = response.body.getReader()
  let received = 0
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    received += value.byteLength
    if (received > maxPreviewBytes) {
      await reader.cancel()
      throw new Error("Preview is too large")
    }
    chunks.push(value)
  }

  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
}

async function storePreview(input: Buffer) {
  const files = r2Files()
  const publicBaseUrl = r2PublicBaseUrl()
  if (!files || !publicBaseUrl) return null

  const output = await sharp(input)
    .rotate()
    .resize({ width: 720, height: 900, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer()
  const hash = createHash("sha256").update(output).digest("hex")
  const key = `keeps/previews/${hash}.webp`

  if (!(await files.exists(key))) {
    await files.upload(key, output, {
      contentType: "image/webp",
      cacheControl: "public, max-age=31536000, immutable",
    })
  }

  return `${publicBaseUrl}/${key}`
}

export async function cacheKeepPreview(
  imageUrl: string | null,
  pageHref?: string
) {
  if (!imageUrl) return null
  const publicBaseUrl = r2PublicBaseUrl()
  if (!publicBaseUrl || imageUrl.startsWith(`${publicBaseUrl}/`)) {
    return imageUrl
  }

  try {
    const url = new URL(imageUrl)
    if (url.protocol !== "https:") throw new Error("Preview URL must use HTTPS")

    const response = await fetch(url, {
      headers: pageHref ? { Referer: new URL(pageHref).origin } : undefined,
      signal: AbortSignal.timeout(10_000),
    })
    return (await storePreview(await readImage(response))) ?? imageUrl
  } catch (error) {
    console.error("Keep preview caching failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return imageUrl
  }
}

export async function captureKeepScreenshotPreview(href: string) {
  const serviceUrl = process.env.KEEP_SCREENSHOT_SERVICE_URL?.trim().replace(
    /\/$/,
    ""
  )
  const apiKey = process.env.KEEP_SCREENSHOT_API_KEY?.trim()
  if (!serviceUrl || !apiKey || !r2Files()) return null

  try {
    const endpoint = new URL(`${serviceUrl}/v1/screenshots`)
    if (endpoint.protocol !== "https:" && endpoint.hostname !== "localhost") {
      throw new Error("Screenshot service must use HTTPS")
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url: href, width: 720, height: 900 }),
      signal: AbortSignal.timeout(30_000),
    })
    if (!response.ok) {
      throw new Error(`Screenshot service returned ${response.status}`)
    }
    return await storePreview(await readImage(response))
  } catch (error) {
    console.error("Keep screenshot capture failed", {
      href,
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return null
  }
}

export function cacheInstagramPreview(imageUrl: string | null) {
  return cacheKeepPreview(imageUrl, "https://www.instagram.com/")
}
