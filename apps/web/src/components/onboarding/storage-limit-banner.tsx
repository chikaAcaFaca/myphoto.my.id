'use client';

import { AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { useStorage } from '@/lib/hooks';
import Link from 'next/link';

export function StorageLimitBanner() {
  const user = useAuthStore((state) => state.user);
  const { data: storage } = useStorage();

  if (!user || !storage) return null;

  const isFreeUser = !user.subscriptionIds || user.subscriptionIds.length === 0;
  if (!isFreeUser || !storage.isAtLimit) return null;

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
        <div>
          <p className="font-medium text-red-800 dark:text-red-200">
            Vaš prostor je pun
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Ne možete upload-ovati nove fajlove. Nadogradite ili pozovite prijatelje za više prostora.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/pricing"
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          Starter — €2.49/mes
        </Link>
        <button
          onClick={() => {
            const card = document.querySelector('[data-bonus-card]');
            card?.scrollIntoView({ behavior: 'smooth' });
          }}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
        >
          Besplatan prostor
        </button>
      </div>
    </div>
  );
}
