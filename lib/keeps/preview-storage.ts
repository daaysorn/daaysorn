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

export async function cacheInstagramPreview(imageUrl: string | null) {
  if (!imageUrl) return null
  const storage = config()
  if (!storage || imageUrl.startsWith(`${storage.publicBaseUrl}/`)) {
    return imageUrl
  }

  try {
    const url = new URL(imageUrl)
    if (url.protocol !== "https:") throw new Error("Preview URL must use HTTPS")

    const response = await fetch(url, {
      headers: { Referer: "https://www.instagram.com/" },
      signal: AbortSignal.timeout(10_000),
    })
    if (!response.ok)
      throw new Error(`Preview download returned ${response.status}`)
    if (!response.headers.get("content-type")?.startsWith("image/")) {
      throw new Error("Preview response is not an image")
    }

    const contentLength = Number(response.headers.get("content-length") ?? 0)
    if (contentLength > maxPreviewBytes) throw new Error("Preview is too large")
    const input = Buffer.from(await response.arrayBuffer())
    if (input.byteLength > maxPreviewBytes)
      throw new Error("Preview is too large")

    const output = await sharp(input)
      .rotate()
      .resize({
        width: 720,
        height: 900,
        fit: "cover",
        withoutEnlargement: true,
      })
      .webp({ quality: 78, effort: 4 })
      .toBuffer()
    const hash = createHash("sha256").update(output).digest("hex")
    const key = `keeps/instagram/${hash}.webp`

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
  } catch (error) {
    console.error("Instagram Keep preview caching failed", {
      message: error instanceof Error ? error.message : "Unknown error",
    })
    return imageUrl
  }
}
