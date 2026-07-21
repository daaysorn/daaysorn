const CACHE_VERSION = "daaysorn-v6"
const PAGE_CACHE = `${CACHE_VERSION}-pages`
const ASSET_CACHE = `${CACHE_VERSION}-assets`
const KEEPS_SYNC_DATABASE = "daaysorn-keeps-sync"
const KEEPS_SYNC_STORE = "outbox"
const KEEPS_SYNC_TAG = "daaysorn-sync-saved-keeps"
const OFFLINE_URL = "/offline"
const REFRESH_URLS = ["/", OFFLINE_URL]
const PRECACHE_URLS = [
  ...REFRESH_URLS,
  "/manifest.webmanifest",
  "/icons/pwa-96.png",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
]

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting()

  if (event.data?.type === "QUEUE_KEEPS_SYNC") {
    event.waitUntil(
      queueKeepsSync(event.data)
        .then(() => self.registration.sync?.register(KEEPS_SYNC_TAG))
        .catch(() => undefined)
    )
  }

  if (event.data?.type === "CLEAR_KEEPS_SYNC") {
    event.waitUntil(clearKeepsSyncChanges(event.data))
  }
})

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter(
                (key) =>
                  key.startsWith("daaysorn-") &&
                  key !== PAGE_CACHE &&
                  key !== ASSET_CACHE
              )
              .map((key) => caches.delete(key))
          )
        ),
      self.registration.navigationPreload?.enable(),
    ]).then(() => self.clients.claim())
  )
})

async function refreshOfflinePages() {
  const cache = await caches.open(PAGE_CACHE)

  await Promise.allSettled(
    REFRESH_URLS.map(async (url) => {
      const response = await fetch(url, { cache: "no-store" })
      if (response.ok) await cache.put(url, response)
    })
  )
}

function openKeepsSyncDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(KEEPS_SYNC_DATABASE, 1)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(KEEPS_SYNC_STORE)) {
        request.result.createObjectStore(KEEPS_SYNC_STORE, { keyPath: "key" })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function validKeepsSyncPayload(data) {
  return (
    typeof data?.session?.id === "string" &&
    typeof data.session.secret === "string" &&
    Array.isArray(data.changes)
  )
}

async function queueKeepsSync(data) {
  if (!validKeepsSyncPayload(data)) return

  const database = await openKeepsSyncDatabase()
  const transaction = database.transaction(KEEPS_SYNC_STORE, "readwrite")
  const store = transaction.objectStore(KEEPS_SYNC_STORE)

  for (const change of data.changes.slice(0, 100)) {
    if (
      typeof change?.keepId !== "string" ||
      typeof change.saved !== "boolean"
    )
      continue

    store.put({
      key: `${data.session.id}:${change.keepId}`,
      keepId: change.keepId,
      saved: change.saved,
      sessionId: data.session.id,
      secret: data.session.secret,
      version: crypto.randomUUID(),
    })
  }

  await transactionDone(transaction)
  database.close()
}

async function readKeepsSyncOutbox() {
  const database = await openKeepsSyncDatabase()
  const transaction = database.transaction(KEEPS_SYNC_STORE, "readonly")
  const items = await requestResult(
    transaction.objectStore(KEEPS_SYNC_STORE).getAll()
  )
  await transactionDone(transaction)
  database.close()
  return items
}

async function deleteKeepsSyncItems(items) {
  if (!items.length) return

  const database = await openKeepsSyncDatabase()
  const transaction = database.transaction(KEEPS_SYNC_STORE, "readwrite")
  const store = transaction.objectStore(KEEPS_SYNC_STORE)

  for (const item of items) {
    const request = store.get(item.key)
    request.onsuccess = () => {
      if (request.result?.version === item.version) store.delete(item.key)
    }
  }

  await transactionDone(transaction)
  database.close()
}

async function clearKeepsSyncChanges(data) {
  if (!validKeepsSyncPayload(data)) return

  const database = await openKeepsSyncDatabase()
  const transaction = database.transaction(KEEPS_SYNC_STORE, "readwrite")
  const store = transaction.objectStore(KEEPS_SYNC_STORE)

  for (const change of data.changes.slice(0, 100)) {
    const key = `${data.session.id}:${change.keepId}`
    const request = store.get(key)
    request.onsuccess = () => {
      if (request.result?.saved === change.saved) store.delete(key)
    }
  }

  await transactionDone(transaction)
  database.close()
}

async function notifyKeepsClients(message) {
  const clients = await self.clients.matchAll({
    type: "window",
    includeUncontrolled: true,
  })
  clients.forEach((client) => client.postMessage(message))
}

async function flushKeepsSyncOutbox() {
  const items = await readKeepsSyncOutbox()
  if (!items.length) return

  const groups = new Map()
  for (const item of items) {
    const groupKey = `${item.sessionId}.${item.secret}`
    const group = groups.get(groupKey) ?? []
    group.push(item)
    groups.set(groupKey, group)
  }

  for (const [authorization, group] of groups) {
    const response = await fetch("/api/keeps/sync", {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${authorization}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        changes: group.map(({ keepId, saved }) => ({ keepId, saved })),
      }),
    })

    if (response.status === 401) {
      await deleteKeepsSyncItems(group)
      await notifyKeepsClients({ type: "KEEPS_BACKGROUND_SYNC_UNAUTHORIZED" })
      continue
    }
    if (!response.ok) throw new Error("Saved Keeps background sync failed")

    const data = await response.json()
    await deleteKeepsSyncItems(group)
    await notifyKeepsClients({
      type: "KEEPS_BACKGROUND_SYNCED",
      savedIds: Array.isArray(data.savedIds) ? data.savedIds : [],
    })
  }
}

self.addEventListener("sync", (event) => {
  if (event.tag === KEEPS_SYNC_TAG) {
    event.waitUntil(flushKeepsSyncOutbox())
    return
  }

  if (event.tag === "daaysorn-refresh-offline-content") {
    event.waitUntil(refreshOfflinePages())
  }
})

self.addEventListener("periodicsync", (event) => {
  if (event.tag === "daaysorn-daily-content-refresh") {
    event.waitUntil(refreshOfflinePages())
  }
})

async function networkFirst(request, preloadResponse) {
  const cache = await caches.open(PAGE_CACHE)

  try {
    const response =
      (await preloadResponse) || (await fetch(request, { cache: "no-store" }))
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match(OFFLINE_URL))
  }
}

function isDynamicPage(pathname) {
  return (
    pathname === "/keeps" ||
    pathname === "/gallery" ||
    pathname === "/rants" ||
    pathname.startsWith("/rants/")
  )
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cached = await cache.match(request)
  const fresh = fetch(request)
    .then((response) => {
      if (response.ok) void cache.put(request, response.clone())
      return response
    })
    .catch(() => new Response("Offline", { status: 503 }))

  return cached || fresh
}

async function networkFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE)

  try {
    const response = await fetch(request, { cache: "no-store" })
    if (response.ok || response.type === "opaque") {
      await cache.put(request, response.clone())
    }
    return response
  } catch {
    return (
      (await cache.match(request)) || new Response("Offline", { status: 503 })
    )
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (request.method !== "GET") {
    return
  }

  // Let Cloudflare and the browser handle remote Gallery media directly.
  // Intercepting cross-origin image responses and video range requests here can
  // turn valid media into unusable opaque or partial responses.
  if (url.origin !== self.location.origin) return
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/image")
  )
    return

  if (request.mode === "navigate") {
    if (isDynamicPage(url.pathname)) {
      event.respondWith(
        fetch(request, { cache: "no-store" }).catch(() =>
          caches.match(OFFLINE_URL)
        )
      )
      return
    }
    event.respondWith(networkFirst(request, event.preloadResponse))
    return
  }

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    request.destination === "image"
  ) {
    event.respondWith(networkFirstAsset(request))
  }
})
