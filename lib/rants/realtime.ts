import * as Ably from "ably"

let restClient: Ably.Rest | undefined

function client() {
  const apiKey = process.env.ABLY_API_KEY?.trim()
  if (!apiKey) return null
  restClient ??= new Ably.Rest({ key: apiKey })
  return restClient
}

export const publicRantsRealtimeChannel = "public:rants"

export async function createRantsRealtimeToken() {
  const ably = client()
  if (!ably) throw new Error("ABLY_API_KEY is not configured")

  return ably.auth.requestToken({
    capability: JSON.stringify({
      [publicRantsRealtimeChannel]: ["subscribe"],
    }),
    clientId: `rants-reader-${crypto.randomUUID()}`,
    ttl: 6 * 60 * 60 * 1000,
  })
}

export async function publishRantsChanged(rantId: string) {
  const ably = client()
  if (!ably) return false

  await ably.channels
    .get(publicRantsRealtimeChannel)
    .publish("changed", { rantId, updatedAt: Date.now() })
  return true
}
