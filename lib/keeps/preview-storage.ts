import { createHash } from "node:crypto"
import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import sharp from "sharp"

const maxPreviewBytes = 8 * 1024 * 1024
let cachedConfig: ReturnType<typeof createConfig> | undefined

function createConfig() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = process.env.R2_BUCKET_NAME?.trim()
  const publicBaseUrl = process.env.R2_PUBLIC_BASE_URL?.trim().replace(
    /\/$/,
    ""
  )

  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !bucket ||
    !publicBaseUrl
  ) {
    return null
  }

  return {
    bucket,
    publicBaseUrl,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  }
}

function config() {
  if (cachedConfig === undefined) cachedConfig = createConfig()
  return cachedConfig
}

async function objectExists(client: S3Client, bucket: string, key: string) {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    return true
  } catch (error) {
    const status = (error as { $metadata?: { httpStatusCode?: number } })
      .$metadata?.httpStatusCode
    if (status === 404) return false
    throw error
  }
}

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
  const storage = config()
  if (!storage) return null

  const output = await sharp(input)
    .rotate()
    .resize({ width: 720, height: 900, fit: "cover", withoutEnlargement: true })
    .webp({ quality: 78, effort: 4 })
    .toBuffer()
  const hash = createHash("sha256").update(output).digest("hex")
  const key = `keeps/previews/${hash}.webp`

  if (!(await objectExists(storage.client, storage.bucket, key))) {
    await storage.client.send(
      new PutObjectCommand({
        Bucket: storage.bucket,
        Key: key,
        Body: output,
        ContentType: "image/webp",
        CacheControl: "public, max-age=31536000, immutable",
      })
    )
  }

  return `${storage.publicBaseUrl}/${key}`
}

export async function cacheKeepPreview(
  imageUrl: string | null,
  pageHref?: string
) {
  if (!imageUrl) return null
  const storage = config()
  if (!storage || imageUrl.startsWith(`${storage.publicBaseUrl}/`)) {
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
  if (!serviceUrl || !apiKey || !config()) return null

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
