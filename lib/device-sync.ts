export type DeviceSyncSession = { id: string; secret: string }

export const favouritesStorageKey = "daaysorn-keeps-favourites"
export const syncSessionStorageKey = "daaysorn-keeps-sync-session"
export const deviceNameStorageKey = "daaysorn-device-display-name"

export function readDeviceSyncSession(): DeviceSyncSession | null {
  try {
    const value = JSON.parse(
      window.localStorage.getItem(syncSessionStorageKey) ?? "null"
    ) as Partial<DeviceSyncSession> | null
    return typeof value?.id === "string" && typeof value.secret === "string"
      ? { id: value.id, secret: value.secret }
      : null
  } catch {
    return null
  }
}
