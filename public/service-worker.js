self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches
      .open('wealth-atlas-cache-v1')
      .then(cache => {
        // Try to cache essential resources, but don't fail if some are missing
        const urlsToCache = ['/', '/manifest.json'];

        return Promise.allSettled(
          urlsToCache.map(url =>
            fetch(url)
              .then(response => {
                if (response.ok) {
                  return cache.put(url, response);
                }
              })
              .catch(error => {
                console.warn(`Failed to cache ${url}:`, error);
              })
          )
        );
      })
      .then(() => {
        console.log('Service Worker installed successfully');
        self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker installation failed:', error);
      })
  );
});

self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== 'wealth-atlas-cache-v1') {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Service Worker activated');
        self.clients.claim();
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        return response;
      }

      return fetch(event.request).catch(error => {
        console.warn('Fetch failed for:', event.request.url, error);
        // Return a basic response for navigation requests when offline
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
        throw error;
      });
    })
  );
});
