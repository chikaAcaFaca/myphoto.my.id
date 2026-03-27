'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, WifiOff, Share, Plus } from 'lucide-react';
import { usePWA } from '@/lib/hooks/use-pwa';

export function PWAPrompt() {
  const { isInstallable, isInstalled, isIOS, isOnline, installApp } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSGuide(true);
    } else {
      installApp();
    }
  };

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

      {/* Install prompt banner */}
      <AnimatePresence>
        {isInstallable && !isInstalled && !dismissed && (
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
                  onClick={handleInstallClick}
                  className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
                >
                  Instaliraj
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS installation guide modal */}
      <AnimatePresence>
        {showIOSGuide && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setShowIOSGuide(false)}
            />
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="relative w-full max-w-sm rounded-t-3xl bg-white p-6 shadow-2xl dark:bg-gray-800 sm:rounded-3xl"
            >
              <div className="mb-6 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-900/30">
                  <Download className="h-8 w-8 text-primary-500" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Instaliraj MyPhoto na iOS
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Pratite ova 3 koraka u Safari pretraživaču
                </p>
              </div>

              <div className="space-y-4">
                {/* Step 1 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    1
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Tapnite dugme za deljenje
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Na dnu ekrana u Safari-ju (kvadrat sa strelicom)
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                      <Share className="h-5 w-5 text-primary-500" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">Share / Podeli</span>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    2
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Pronađite &quot;Add to Home Screen&quot;
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Skrolujte u meniju i tapnite ovu opciju
                    </p>
                    <div className="mt-2 flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 dark:bg-gray-700">
                      <Plus className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                      <span className="text-xs text-gray-600 dark:text-gray-300">Add to Home Screen</span>
                    </div>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="flex items-start gap-4">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                    3
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      Tapnite &quot;Add&quot; / &quot;Dodaj&quot;
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      MyPhoto ikonica će se pojaviti na vašem Home Screen-u
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setShowIOSGuide(false);
                  setDismissed(true);
                }}
                className="mt-6 w-full rounded-xl bg-primary-500 py-3 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-[0.98]"
              >
                Razumem
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
