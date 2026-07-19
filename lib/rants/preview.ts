import { createHmac, timingSafeEqual } from "node:crypto"

function previewSecret() {
  return (
    process.env.RANTS_PREVIEW_SECRET?.trim() ||
    process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ||
    ""
  )
}

export function createRantPreviewToken(rantId: string) {
  const secret = previewSecret()
  if (!secret) return null
  return createHmac("sha256", secret).update(rantId).digest("base64url")
}

export function validRantPreviewToken(rantId: string, token: string) {
  const expected = createRantPreviewToken(rantId)
  if (!expected) return false
  const actualBuffer = Buffer.from(token)
  const expectedBuffer = Buffer.from(expected)
  return (
    actualBuffer.length === expectedBuffer.length &&
    timingSafeEqual(actualBuffer, expectedBuffer)
  )
}
