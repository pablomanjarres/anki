const CACHE = 'anki-shell-v6-type-b';
const BRAND_VERSION = 'geometric-1';
const brandUrl = path => `${path}?v=${path === '/brand/anki-wordmark.svg' || path === '/brand/anki-logo.svg' ? 'type-b-1' : BRAND_VERSION}`;
const SHELL = ['/', brandUrl('/manifest.webmanifest'), brandUrl('/favicon.svg'), brandUrl('/brand/anki-symbol.svg'), brandUrl('/brand/anki-wordmark.svg'), brandUrl('/brand/anki-logo.svg'), brandUrl('/brand/anki-app-icon.svg'), brandUrl('/icon-180.png'), brandUrl('/icon-192.png'), brandUrl('/icon-512.png'), brandUrl('/icon-maskable-512.png')];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const html = await fetch('/', { cache: 'no-store' }).then(response => response.text());
    const assets = [...html.matchAll(/(?:src|href)="(\/assets\/[^\"]+)"/g)].map(match => match[1]);
    const cache = await caches.open(CACHE);
    await cache.addAll([...SHELL, ...assets].map(path => new Request(path, { cache: 'reload' })));
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
