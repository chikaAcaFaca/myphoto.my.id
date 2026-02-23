'use client';

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [swRegistration, setSWRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Online/offline tracking
    setIsOnline(navigator.onLine);
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          setSWRegistration(reg);

          // Request periodic background sync (if supported)
          if ('periodicSync' in reg) {
            (reg as any).periodicSync
              .register('auto-sync', { minInterval: 12 * 60 * 60 * 1000 }) // 12 hours
              .catch(() => {
                // Periodic sync requires permission; silently fail
              });
          }
        })
        .catch((err) => {
          console.warn('SW registration failed:', err);
        });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'UPLOAD_COMPLETE') {
          // Could dispatch to a store or show a notification
          console.log('[PWA] Background upload complete:', event.data.fileName);
        }
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installApp = useCallback(async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setIsInstallable(false);
    if (outcome === 'accepted') {
      setIsInstalled(true);
      return true;
    }
    return false;
  }, [deferredPrompt]);

  const queueUpload = useCallback(
    async (file: File, authToken: string) => {
      if (!('indexedDB' in window)) return false;

      try {
        const db = await openUploadDB();
        const tx = db.transaction('pending-uploads', 'readwrite');
        const store = tx.objectStore('pending-uploads');
        store.add({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
          fileBlob: file,
          authToken,
          queuedAt: Date.now(),
        });

        // Request a sync
        if (swRegistration && 'sync' in swRegistration) {
          await (swRegistration as any).sync.register('sync-uploads');
        }

        return true;
      } catch {
        return false;
      }
    },
    [swRegistration]
  );

  return {
    isInstallable,
    isInstalled,
    isOnline,
    installApp,
    queueUpload,
    swRegistration,
  };
}

function openUploadDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('myphoto-uploads', 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('pending-uploads')) {
        db.createObjectStore('pending-uploads', { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
