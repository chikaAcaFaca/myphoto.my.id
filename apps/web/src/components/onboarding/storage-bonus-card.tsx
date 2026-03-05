'use client';

import { useState, useEffect } from 'react';
import { X, Check, Smartphone, Users, Copy, ExternalLink } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { useReferralStats, useStorage, useClaimBackupBonus } from '@/lib/hooks';
import { BACKUP_BONUS, REFERRAL_BONUS, MAX_REFERRALS, FREE_STORAGE_LIMIT, BYTES_PER_GB } from '@myphoto/shared';
import { cn } from '@/lib/utils';

const DISMISS_KEY = 'myphoto_bonus_card_dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export function StorageBonusCard() {
  const user = useAuthStore((state) => state.user);
  const { data: referralStats } = useReferralStats();
  const { data: storage } = useStorage();
  const [dismissed, setDismissed] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const elapsed = Date.now() - parseInt(dismissedAt, 10);
      setDismissed(elapsed < DISMISS_DURATION);
    } else {
      setDismissed(false);
    }
  }, []);

  if (!user || dismissed) return null;

  // Only show for free-tier users (no subscriptions)
  const isFreeUser = !user.subscriptionIds || user.subscriptionIds.length === 0;
  if (!isFreeUser) return null;

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setDismissed(true);
  };

  const backupClaimed = user.backupBonusClaimed === true;
  const referralCount = referralStats?.referralCount ?? user.referralCount ?? 0;
  const referralBonus = referralCount * REFERRAL_BONUS;

  const totalEarned = FREE_STORAGE_LIMIT + (backupClaimed ? BACKUP_BONUS : 0) + referralBonus;
  const maxPossible = FREE_STORAGE_LIMIT + BACKUP_BONUS + MAX_REFERRALS * REFERRAL_BONUS; // 1+4+10 = 15GB
  const percentage = Math.min(100, Math.round((totalEarned / maxPossible) * 100));

  const formatGB = (bytes: number) => `${Math.round(bytes / BYTES_PER_GB)} GB`;

  const referralLink = referralStats?.referralLink || `https://myphoto.my.id/register?ref=${user.referralCode}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50 to-blue-50 p-5 dark:border-primary-800 dark:from-primary-950/30 dark:to-blue-950/30">
      <button
        onClick={handleDismiss}
        className="absolute right-3 top-3 rounded-full p-1 text-gray-400 hover:bg-white/50 hover:text-gray-600 dark:hover:bg-gray-800/50"
      >
        <X className="h-4 w-4" />
      </button>

      <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
        Dobijte do {formatGB(maxPossible)} besplatno!
      </h3>

      <div className="space-y-3">
        {/* Step 1: Free storage */}
        <BonusStep
          completed
          label="Registracija"
          bonus={formatGB(FREE_STORAGE_LIMIT)}
        />

        {/* Step 2: App install + backup */}
        <BonusStep
          completed={backupClaimed}
          label="Instaliraj app + uključi backup"
          bonus={`+${formatGB(BACKUP_BONUS)}`}
        >
          {!backupClaimed && (
            <a
              href="https://play.google.com/store/apps/details?id=com.myphoto.app"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-700"
            >
              <Smartphone className="h-3.5 w-3.5" />
              Preuzmi za Android
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </BonusStep>

        {/* Step 3: Referrals */}
        <BonusStep
          completed={referralCount >= MAX_REFERRALS}
          partial={referralCount > 0 && referralCount < MAX_REFERRALS}
          label={`Pozovi prijatelje (${referralCount}/${MAX_REFERRALS})`}
          bonus={`+${formatGB(MAX_REFERRALS * REFERRAL_BONUS)}`}
        >
          <button
            onClick={handleCopyLink}
            className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-primary-300 bg-white px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-50 dark:border-primary-700 dark:bg-gray-800 dark:text-primary-300 dark:hover:bg-gray-700"
          >
            <Copy className="h-3.5 w-3.5" />
            {copied ? 'Kopirano!' : 'Kopiraj referral link'}
          </button>
        </BonusStep>
      </div>

      {/* Progress bar */}
      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
          <span>Ukupno: {formatGB(totalEarned)} od {formatGB(maxPossible)}</span>
          <span>{percentage}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary-500 to-blue-500 transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function BonusStep({
  completed,
  partial,
  label,
  bonus,
  children,
}: {
  completed: boolean;
  partial?: boolean;
  label: string;
  bonus: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div
        className={cn(
          'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
          completed
            ? 'bg-green-500 text-white'
            : partial
            ? 'bg-yellow-400 text-white'
            : 'border-2 border-gray-300 dark:border-gray-600'
        )}
      >
        {completed && <Check className="h-3 w-3" />}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span
            className={cn(
              'text-sm',
              completed
                ? 'text-gray-500 line-through dark:text-gray-400'
                : 'font-medium text-gray-900 dark:text-white'
            )}
          >
            {label}
          </span>
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-400">
            {bonus}
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
