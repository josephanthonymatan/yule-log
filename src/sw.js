// Lets the fire keep burning with no connection. The build fills in the version and file list.
// Only the site's own files are handled: weather always goes to the network, and with no
// network the page falls back on what the place usually does.
const CACHE = 'yule-__VERSION__';
const FILES = __FILES__;
const WAIT_MS = 3000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('yule-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The network first, so that a new version shows up, but not for long on a bad connection
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  const key = request.mode === 'navigate' ? '/' : url.pathname;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const stored = await cache.match(key);
    const live = fetch(request).then((res) => {
      if (res.ok && FILES.includes(key)) cache.put(key, res.clone());
      return res;
    });
    if (!stored) return live;
    const timeout = new Promise((done) => setTimeout(() => done(stored), WAIT_MS));
    return Promise.race([live.catch(() => stored), timeout]);
  })());
});
