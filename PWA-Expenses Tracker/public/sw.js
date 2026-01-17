// ⚠️ QUAN TRỌNG: Thay đổi APP_VERSION mỗi khi deploy để trigger cập nhật
// Ví dụ: 'v2', 'v3', '2024-01-14-1', etc.
const APP_VERSION = 'v8';
const CACHE_NAME = `gg-expenses-${APP_VERSION}`;
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json'
];

// Install event - ALWAYS skip waiting to activate immediately
self.addEventListener('install', (event) => {
    console.log('[SW] Installing new version:', APP_VERSION);
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
    // Force activate immediately
    self.skipWaiting();
});

// Lắng nghe message từ client để kích hoạt SW mới
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Activate event
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event - Network first, fallback to cache
// IMPORTANT: Always fetch JS files from network (never serve stale JS)
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip cross-origin requests
    if (!event.request.url.startsWith(self.location.origin)) return;

    const url = new URL(event.request.url);
    
    // For JS files: ALWAYS go to network first, don't serve stale cache
    const isJSFile = url.pathname.endsWith('.js') || url.pathname.includes('/assets/');
    
    if (isJSFile) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    // Cache the new version
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Only use cache if network completely fails
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For other assets: Network first with cache fallback
    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Clone the response
                const responseToCache = response.clone();

                // Cache the fetched response
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });

                return response;
            })
            .catch(() => {
                // If network fails, try to get from cache
                return caches.match(event.request)
                    .then((response) => {
                        if (response) {
                            return response;
                        }
                        // Return offline page if available
                        return caches.match('/');
                    });
            })
    );
});
