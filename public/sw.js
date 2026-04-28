const CACHE_NAME = 'caixa-mestre-v1'
const urlsToCache = [
  '/CAIXA-MESTRE-APP/',
  '/CAIXA-MESTRE-APP/index.html',
  '/CAIXA-MESTRE-APP/caixa-mestre-logo.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  )
})

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response
        }
        return fetch(event.request)
      })
  )
})
