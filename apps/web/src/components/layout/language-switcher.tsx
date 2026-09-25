'use client';

import { Globe } from 'lucide-react';
import { useI18n } from '@/i18n/client';
import { cn } from '@/lib/utils';

/** Compact EN / SR toggle. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useI18n();
  return (
    <div className={cn('inline-flex items-center gap-1 text-sm', className)}>
      <Globe className="h-4 w-4 text-gray-400" aria-hidden />
      {(['en', 'sr'] as const).map((l) => (
        <button
          key={l}
          onClick={() => l !== locale && setLocale(l)}
          aria-pressed={l === locale}
          className={cn(
            'rounded px-1.5 py-0.5 uppercase',
            l === locale ? 'font-semibold text-primary-600' : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
