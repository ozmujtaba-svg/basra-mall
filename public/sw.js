const CACHE_NAME = "basra-mall-v2"
const APP_SHELL = [
  "/",
  "/manifest.webmanifest",
  "/app-icon-192.png",
  "/app-icon-512.png",
  "/apple-touch-icon.png",
]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  )
  self.clients.claim()
})

self.addEventListener("fetch", (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== "GET" || url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseCopy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put("/", responseCopy))
          return response
        })
        .catch(() => caches.match("/")),
    )
    return
  }

  event.respondWith(
    caches.match(request).then(
      (cachedResponse) =>
        cachedResponse ??
        fetch(request).then((response) => {
          if (response.ok) {
            const responseCopy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseCopy))
          }
          return response
        }),
    ),
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url ?? self.location.origin

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      const existingClient = clients.find((client) => client.url.startsWith(self.location.origin))

      if (existingClient) {
        existingClient.navigate(targetUrl)
        return existingClient.focus()
      }

      return self.clients.openWindow(targetUrl)
    }),
  )
})
