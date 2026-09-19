const CACHE = 'anki-shell-v2';
const SHELL = ['/', '/manifest.webmanifest', '/icon-180.png', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const html = await fetch('/', { cache: 'no-store' }).then(response => response.text());
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
    const cache = await caches.open(CACHE);
    await cache.addAll([...SHELL, ...assets]);
    await self.skipWaiting();
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil(Promise.all([caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))), self.clients.claim()]));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) { const copy = response.clone(); void caches.open(CACHE).then(cache => cache.put(event.request, copy)); }
    return response;
  }).catch(() => caches.match(event.request).then(cached => cached || Response.error())));
});
