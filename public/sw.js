const CACHE_VERSION = "daaysorn-v1"
const PAGE_CACHE = `${CACHE_VERSION}-pages`
const ASSET_CACHE = `${CACHE_VERSION}-assets`
const PRECACHE_URLS = [
  "/",
  "/keeps",
  "/gallery",
  "/offline",
  "/manifest.webmanifest",
  "/icons/pwa-192.png",
  "/icons/pwa-512.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(PAGE_CACHE)
      .then((cache) =>
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
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
      )
      .then(() => self.clients.claim())
  )
})

async function networkFirst(request) {
  const cache = await caches.open(PAGE_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) await cache.put(request, response.clone())
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match("/offline"))
  }
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

self.addEventListener("fetch", (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/_next/image")
  ) {
    return
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request))
    return
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/images/") ||
    ["font", "image", "script", "style"].includes(request.destination)
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})
