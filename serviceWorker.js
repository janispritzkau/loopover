const cacheName = "offline-cache-1"

this.addEventListener("install", e => {
  e.waitUntil(
    caches.open(cacheName).then(cache => {
      cache.addAll([
        "/",
        "/index.html",
        "/ResizeObserver.js",
        "/icon.png"
      ])
    })
  )
})

this.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request)
    .then(res => {
      return fetch(event.request).catch(err => res);
    })
  )
})