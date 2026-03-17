'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Coffee, Gift, TrendingUp } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { useStorage } from '@/lib/hooks';
import Link from 'next/link';

type WarningLevel = '80' | '95' | '100' | null;

function getDismissKey(level: string) {
  return `myphoto_warning_${level}_dismissed`;
}

function isDismissed(level: string): boolean {
  if (typeof window === 'undefined') return false;
  const dismissed = localStorage.getItem(getDismissKey(level));
  if (!dismissed) return false;
  // Re-show after 3 days
  const dismissedAt = Number(dismissed);
  return Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000;
}

export function StorageLimitBanner() {
  const user = useAuthStore((state) => state.user);
  const { data: storage } = useStorage();
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    const d = new Set<string>();
    for (const level of ['80', '95', '100']) {
      if (isDismissed(level)) d.add(level);
    }
    setDismissed(d);
  }, []);

  if (!user || !storage) return null;

  const level: WarningLevel = storage.isAtLimit ? '100' : storage.isAt95 ? '95' : storage.isAt80 ? '80' : null;
  if (!level || dismissed.has(level)) return null;

  const handleDismiss = () => {
    localStorage.setItem(getDismissKey(level), String(Date.now()));
    setDismissed((prev) => new Set(prev).add(level));
  };

  const scrollToBonus = () => {
    const card = document.querySelector('[data-bonus-card]');
    card?.scrollIntoView({ behavior: 'smooth' });
  };

  if (level === '100') {
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
            Nadogradi plan
          </Link>
          <button
            onClick={scrollToBonus}
            className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            Besplatan prostor
          </button>
        </div>
      </div>
    );
  }

  if (level === '95') {
    return (
      <div className="mb-6 flex flex-col gap-3 rounded-xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-800 dark:bg-orange-950/30 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp className="h-5 w-5 shrink-0 text-orange-500" />
          <div>
            <p className="font-medium text-orange-800 dark:text-orange-200">
              Skoro ste popunili prostor!
            </p>
            <p className="text-sm text-orange-600 dark:text-orange-400">
              Ostalo vam je samo {storage.remainingFormatted}. Nadogradite za cenu jedne kafe mesečno.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            <Coffee className="h-3.5 w-3.5" />
            Od €0.82/mes
          </Link>
          <button
            onClick={handleDismiss}
            className="rounded-lg border border-orange-300 px-3 py-2 text-sm text-orange-700 hover:bg-orange-100 dark:border-orange-700 dark:text-orange-300 dark:hover:bg-orange-900/30"
          >
            Kasnije
          </button>
        </div>
      </div>
    );
  }

  // level === '80'
  return (
    <div className="mb-6 flex flex-col gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <Gift className="h-5 w-5 shrink-0 text-amber-500" />
        <div>
          <p className="font-medium text-amber-800 dark:text-amber-200">
            Ostalo vam je {storage.remainingFormatted}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Pozovite prijatelja i dobijte +1 GB besplatno, ili nadogradite za cenu jedne kafe!
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          onClick={scrollToBonus}
          className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          <Gift className="h-3.5 w-3.5" />
          Besplatan GB
        </button>
        <Link
          href="/pricing"
          className="flex items-center gap-1.5 rounded-lg border border-amber-300 px-3 py-2 text-sm font-medium text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/30"
        >
          <Coffee className="h-3.5 w-3.5" />
          Od €0.82/mes
        </Link>
        <button
          onClick={handleDismiss}
          className="text-sm text-amber-500 underline hover:text-amber-700"
        >
          Kasnije
        </button>
      </div>
    </div>
  );
}
