'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, WifiOff } from 'lucide-react';
import { usePWA } from '@/lib/hooks/use-pwa';

export function PWAPrompt() {
  const { isInstallable, isOnline, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {/* Offline indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-sm font-medium text-white"
          >
            <WifiOff className="h-4 w-4" />
            Nema internet konekcije. Radi se u offline režimu.
          </motion.div>
        )}
      </AnimatePresence>

      {/* Install prompt */}
      <AnimatePresence>
        {isInstallable && !dismissed && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-6 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2"
          >
            <div className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl dark:border-gray-700 dark:bg-gray-800">
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-50 dark:bg-primary-900/30">
                <Download className="h-6 w-6 text-primary-500" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  Instaliraj MyPhoto
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Brži pristup, offline režim i auto-sync
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDismissed(true)}
                  className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
                >
                  <X className="h-4 w-4" />
                </button>
                <button
                  onClick={installApp}
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
                >
                  Instaliraj
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
