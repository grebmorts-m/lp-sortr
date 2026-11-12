// Cover image cache: cache-first for album artwork, so covers show instantly on revisits.
// Both hosts send CORS headers, so responses are stored as normal (non-opaque) entries.

const CACHE = 'lp-sortr-covers-v1'
const MAX_ENTRIES = 1500
const COVER_HOSTS = [/(^|\.)mzstatic\.com$/, /^coverartarchive\.org$/, /(^|\.)archive\.org$/]

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('lp-sortr-covers-') && key !== CACHE) await caches.delete(key)
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || req.destination !== 'image') return
  const url = new URL(req.url)
  if (!COVER_HOSTS.some((re) => re.test(url.hostname))) return
  event.respondWith(coverFirst(req, event))
})

async function coverFirst(req, event) {
  const cache = await caches.open(CACHE)
  const hit = await cache.match(req.url)
  if (hit) return hit
  try {
    // CORS request so the stored response is readable and small (opaque ones are padded).
    const res = await fetch(req.url, { mode: 'cors', credentials: 'omit' })
    if (res.ok) {
      event.waitUntil(cache.put(req.url, res.clone()).then(() => trim(cache)))
    }
    return res
  } catch {
    return fetch(req) // fall back to the browser's own request
  }
}

let trimming = false
async function trim(cache) {
  if (trimming) return
  trimming = true
  try {
    const keys = await cache.keys() // insertion order: oldest first
    for (const key of keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await cache.delete(key)
  } finally {
    trimming = false
  }
}
