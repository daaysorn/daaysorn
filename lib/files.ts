import { Files } from "files-sdk"
import { r2 } from "files-sdk/r2"

let cachedFiles: Files | null | undefined
let cachedPublicBaseUrl: string | null | undefined

function createFiles() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID?.trim()
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim()
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim()
  const bucket = process.env.R2_BUCKET_NAME?.trim()
  const log = process.env.FILES_SDK_LOG?.trim() === "1"

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null

  return new Files({
    adapter: r2({
      bucket,
      accountId,
      accessKeyId,
      secretAccessKey,
    }),
    hooks: {
      onAction({ type, status, durationMs }) {
        if (!log) return
        console.info("files-sdk action", { type, status, durationMs })
      },
      onRetry({ type, attempt }) {
        if (!log) return
        console.warn("files-sdk retry", { type, attempt })
      },
      onError({ error }) {
        // files-sdk surfaces its own error types; keep logs minimal and safe.
        console.error("files-sdk error", {
          message: error instanceof Error ? error.message : "Unknown error",
        })
      },
    },
  })
}

export function r2Files() {
  if (cachedFiles === undefined) cachedFiles = createFiles()
  return cachedFiles
}

export function r2PublicBaseUrl() {
  if (cachedPublicBaseUrl !== undefined) return cachedPublicBaseUrl
  cachedPublicBaseUrl =
    process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, "") ?? null
  return cachedPublicBaseUrl
}
