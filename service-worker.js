const CACHE_NAME = 'wesnoth-editor-v5';
const urlsToCache = [
  '/',
  '/index.html',
  '/wesnoth_editor.css',
  '/wesnoth_editor.js',
  '/main.js',
  '/library-wml.js',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  // Handle file protocol inside install handler
  if (self.location.protocol === 'file:') {
    console.log('Skipping service worker for file protocol');
    self.skipWaiting();  // Bypass waiting phase
    return;  // Exit early from install event
  }

  // Normal install process for http/https
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});


self.addEventListener('fetch', event => {
  // Add special handling for manifest
  if (event.request.url.endsWith('/manifest.json')) {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});

// Background sync handler
self.addEventListener('sync', event => {
  if (event.tag === 'save-operation' || event.tag === 'pending-operations') {
    event.waitUntil(
      handleBackgroundSync()
        .catch(err => {
          console.error('Background sync failed:', err);
          // Reschedule the sync for later
          return self.registration.sync.register(event.tag);
        })
    );
  }
});

// Push notification handler
self.addEventListener('push', event => {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      badge: '/icon-192x192.png'
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('https://wesnoth-editor.example.com') // Replace with your URL
  );
});

// Background sync handler function
async function handleBackgroundSync() {
  // Retrieve pending operations from IndexedDB
  const pendingOperations = await getPendingOperations();
  
  if (pendingOperations.length > 0) {
    // Send operations to server
    const success = await sendToServer(pendingOperations);
    
    if (success) {
      // Clear pending operations
      await clearPendingOperations();
    }
  }
}

// Mock database functions
async function getPendingOperations() {
  return new Promise(resolve => {
    // In real implementation, use IndexedDB
    resolve(JSON.parse(localStorage.getItem('pendingOperations') || []));
  });
}

async function clearPendingOperations() {
  localStorage.removeItem('pendingOperations');
}

async function sendToServer(operations) {
  // In real implementation, send to your backend
  console.log('Syncing operations:', operations);
  return true;
}