import * as Ably from "ably"

let restClient: Ably.Rest | undefined

function client() {
  const apiKey = process.env.ABLY_API_KEY?.trim()
  if (!apiKey) return null
  restClient ??= new Ably.Rest({ key: apiKey })
  return restClient
}

export function keepsRealtimeChannel(groupId: string) {
  return `private:keeps:${groupId}`
}

export const publicKeepsRealtimeChannel = "public:keeps"

export async function createKeepsRealtimeToken(groupId: string) {
  const ably = client()
  if (!ably) throw new Error("ABLY_API_KEY is not configured")

  return ably.auth.requestToken({
    capability: JSON.stringify({
      [keepsRealtimeChannel(groupId)]: ["subscribe"],
      [publicKeepsRealtimeChannel]: ["subscribe"],
    }),
    clientId: `keeps-${crypto.randomUUID()}`,
    ttl: 6 * 60 * 60 * 1000,
  })
}

export async function createPublicKeepsRealtimeToken() {
  const ably = client()
  if (!ably) throw new Error("ABLY_API_KEY is not configured")

  return ably.auth.requestToken({
    capability: JSON.stringify({
      [publicKeepsRealtimeChannel]: ["subscribe"],
    }),
    clientId: `keeps-reader-${crypto.randomUUID()}`,
    ttl: 6 * 60 * 60 * 1000,
  })
}

export async function publishKeepsChanged(groupId: string) {
  const ably = client()
  if (!ably) return false

  await ably.channels
    .get(keepsRealtimeChannel(groupId))
    .publish("changed", { updatedAt: Date.now() })
  return true
}

export async function publishPublicKeepsChanged() {
  const ably = client()
  if (!ably) return false

  await ably.channels
    .get(publicKeepsRealtimeChannel)
    .publish("changed", { updatedAt: Date.now() })
  return true
}
