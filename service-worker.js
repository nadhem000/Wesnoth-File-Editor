const CACHE_NAME = 'wesnoth-editor-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/wesnoth_editor.css',
  '/wesnoth_editor.js',
  '/library-wml.js',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});