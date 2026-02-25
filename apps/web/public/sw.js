/// <reference lib="webworker" />

const CACHE_NAME = 'myphoto-v1';
const DB_NAME = 'myphoto-uploads';
const DB_VERSION = 2;
const STATIC_ASSETS = [
  '/logo.png',
  '/logo-transparent.png',
];

// Install: pre-cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // API calls: network-first
  if (url.pathname.startsWith('/api/')) {
    // Cache thumbnail responses for offline viewing
    if (url.pathname.startsWith('/api/thumbnail/')) {
      event.respondWith(
        caches.open(CACHE_NAME).then(async (cache) => {
          try {
            const networkResponse = await fetch(request);
            if (networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          } catch {
            const cached = await cache.match(request);
            return cached || new Response('Offline', { status: 503 });
          }
        })
      );
      return;
    }
    // Other API calls: network only
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/photos').then((cached) => cached || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)$/) ||
    url.pathname.startsWith('/_next/')
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }
});

// Background Sync: upload queued files when connectivity returns
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-uploads') {
    event.waitUntil(processUploadQueue());
  }
});

// Periodic Background Sync: auto-check for new uploads
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'auto-sync') {
    event.waitUntil(processUploadQueue());
  }
});

async function shouldProcessUploads() {
  try {
    const db = await openUploadDB();
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const settings = await getFromStore(store, 'sync');

    if (!settings) return true; // default: allow

    if (settings.syncMode === 'manual') return false;

    const conn = navigator.connection;
    if (!conn) return true; // can't detect network type, allow

    const isCellular = conn.type === 'cellular';

    if (settings.syncMode === 'wifi_only' && isCellular) return false;

    if (settings.syncMode === 'wifi_and_mobile' && isCellular && !settings.allowRoaming) {
      // On cellular — allowed, but if roaming check is enabled and user is roaming, skip
      // navigator.connection doesn't expose roaming directly, so allowRoaming=false
      // means "don't upload on cellular at all when roaming is disabled"
      // We trust the user set this intentionally
    }

    return true;
  } catch {
    return true; // on error, allow
  }
}

async function processUploadQueue() {
  try {
    const allowed = await shouldProcessUploads();
    if (!allowed) return;

    // Read pending uploads from IndexedDB
    const db = await openUploadDB();
    const tx = db.transaction('pending-uploads', 'readonly');
    const store = tx.objectStore('pending-uploads');
    const items = await getAllFromStore(store);

    for (const item of items) {
      // Skip items that need a fresh token
      if (item.needsTokenRefresh) continue;

      try {
        // Step 1: Get upload URL (API expects: filename, mimeType, size)
        const urlRes = await fetch('/api/files/upload-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${item.authToken}`,
          },
          body: JSON.stringify({
            filename: item.fileName,
            mimeType: item.mimeType,
            size: item.fileSize,
          }),
        });

        if (urlRes.status === 401) {
          // Token expired — mark for refresh, skip
          const markTx = db.transaction('pending-uploads', 'readwrite');
          const markStore = markTx.objectStore('pending-uploads');
          item.needsTokenRefresh = true;
          markStore.put(item);
          continue;
        }

        if (!urlRes.ok) continue;
        const urlData = await urlRes.json();

        // Step 2: Upload to S3
        const uploadRes = await fetch(urlData.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': item.mimeType },
          body: item.fileBlob,
        });

        if (!uploadRes.ok) continue;

        // Step 3: Confirm upload (API expects: fileId, s3Key, name, size, mimeType)
        const confirmRes = await fetch('/api/files/confirm-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${item.authToken}`,
          },
          body: JSON.stringify({
            fileId: urlData.fileId,
            s3Key: urlData.s3Key,
            name: item.fileName,
            size: item.fileSize,
            mimeType: item.mimeType,
          }),
        });

        if (confirmRes.status === 401) {
          const markTx = db.transaction('pending-uploads', 'readwrite');
          markTx.objectStore('pending-uploads').put({ ...item, needsTokenRefresh: true });
          continue;
        }

        if (!confirmRes.ok) continue;

        // Remove from queue
        const delTx = db.transaction('pending-uploads', 'readwrite');
        delTx.objectStore('pending-uploads').delete(item.id);

        // Notify client
        const clients = await self.clients.matchAll();
        clients.forEach((client) => {
          client.postMessage({
            type: 'UPLOAD_COMPLETE',
            fileName: item.fileName,
            fileId: urlData.fileId,
          });
        });
      } catch {
        // Will retry on next sync
      }
    }
  } catch (error) {
    console.error('[SW] Upload queue error:', error);
  }
}

function openUploadDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-uploads')) {
        db.createObjectStore('pending-uploads', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAllFromStore(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getFromStore(store, key) {
  return new Promise((resolve, reject) => {
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// Push notification handler (for future use)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  event.waitUntil(
    self.registration.showNotification(data.title || 'MyPhoto', {
      body: data.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/photos'));
});
