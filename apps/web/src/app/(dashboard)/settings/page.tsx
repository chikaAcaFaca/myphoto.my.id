'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Cloud,
  Palette,
  Shield,
  Bell,
  HardDrive,
  Wifi,
  WifiOff,
  Smartphone,
  Globe,
  Moon,
  Sun,
  ChevronRight,
  Check,
  Crown,
  Download,
  Trash2,
  LogOut,
  Camera,
  Gift,
  Copy,
  Users,
  Share2,
  Lock,
} from 'lucide-react';
import { getIdToken, reauthenticate, usesPasswordAuth } from '@/lib/firebase';
import { useAuthStore, useUIStore } from '@/lib/stores';
import { useStorage, usePWA, useReferralStats } from '@/lib/hooks';
import { updateUserSettings } from '@/lib/firebase';
import { syncSettingsToIDB } from '@/lib/upload-queue';
import type { UserSettings } from '@myphoto/shared';
import { REFERRAL_BONUS, formatBytes } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { DeleteAccountDialog } from '@/components/settings/delete-account-dialog';
import { SubscriptionSection } from '@/components/settings/subscription-section';
import { useI18n } from '@/i18n/client';

type SettingsSection = 'account' | 'storage' | 'referral' | 'sync' | 'appearance' | 'privacy';

export default function SettingsPage() {
  const { user, firebaseUser, signOut } = useAuthStore();
  const { isDarkMode, toggleDarkMode, addNotification } = useUIStore();
  const { data: storage } = useStorage();
  const { isInstalled, isInstallable, installApp } = usePWA();
  const { data: referralStats } = useReferralStats();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const { t, locale, setLocale } = useI18n();

  useEffect(() => {
    if (user?.settings) {
      setSettings(user.settings);
    }
  }, [user?.settings]);

  const updateSetting = async <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    if (!user || !settings) return;
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    setSaving(true);
    try {
      await updateUserSettings(user.id, { [key]: value });
      // Mirror sync-relevant settings to IndexedDB for SW access
      if (key === 'syncMode' || key === 'allowRoaming' || key === 'autoBackup') {
        syncSettingsToIDB({
          syncMode: newSettings.syncMode,
          allowRoaming: newSettings.allowRoaming,
          autoBackup: newSettings.autoBackup,
        });
      }
      addNotification({ type: 'success', title: t('dashboard.settings.saved'), message: t('dashboard.settings.savedMsg') });
    } catch {
      setSettings(settings); // revert
      addNotification({ type: 'error', title: t('dashboard.shared.error'), message: t('dashboard.settings.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const copyToClipboard = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  // Password setter — required by Google-OAuth users who want to log in
  // on desktop / CLI / older mobile builds where Firebase popup auth
  // isn't an option.
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordCard, setShowPasswordCard] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const handleSetPassword = async () => {
    if (newPassword.length < 8) {
      addNotification({ type: 'error', title: t('dashboard.settings.passwordTooShort'), message: t('dashboard.settings.passwordMin') });
      return;
    }
    if (newPassword !== confirmPassword) {
      addNotification({ type: 'error', title: t('dashboard.settings.passwordMismatch') });
      return;
    }
    setSettingPassword(true);
    try {
      const send = (token: string | null) =>
        fetch('/api/auth/set-password', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: newPassword }),
        });
      let res = await send(await getIdToken());
      // The server wants a sign-in from the last 10 minutes. Google accounts
      // can re-confirm with a popup; password accounts must sign in again.
      if (res.status === 403 && !usesPasswordAuth()) {
        res = await send(await reauthenticate());
      }
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t('dashboard.shared.error'));
      }
      addNotification({ type: 'success', title: t('dashboard.settings.passwordSet'), message: t('dashboard.settings.passwordSetMsg') });
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordCard(false);
    } catch (e) {
      addNotification({ type: 'error', title: t('dashboard.shared.error'), message: e instanceof Error ? e.message : t('dashboard.settings.unknownError') });
    } finally {
      setSettingPassword(false);
    }
  };

  const sections: { id: SettingsSection; label: string; icon: any }[] = [
    { id: 'account', label: t('dashboard.settings.sectionAccount'), icon: User },
    { id: 'storage', label: t('dashboard.settings.sectionStorage'), icon: HardDrive },
    { id: 'referral', label: t('dashboard.settings.sectionReferral'), icon: Gift },
    { id: 'sync', label: t('dashboard.settings.sectionSync'), icon: Cloud },
    { id: 'appearance', label: t('dashboard.settings.sectionAppearance'), icon: Palette },
    { id: 'privacy', label: t('dashboard.settings.sectionPrivacy'), icon: Shield },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      <h1 className="mb-6 text-2xl font-bold">{t('dashboard.settings.title')}</h1>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Section nav */}
        <nav className="flex gap-1 overflow-x-auto lg:w-56 lg:flex-col lg:overflow-visible">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'flex items-center gap-3 whitespace-nowrap rounded-xl px-4 py-3 text-sm font-medium transition-all',
                  activeSection === section.id
                    ? 'bg-primary-50 text-primary-700 shadow-sm dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800'
                )}
              >
                <Icon className="h-5 w-5 flex-shrink-0" />
                {section.label}
              </button>
            );
          })}
        </nav>

        {/* Content */}
        <div className="flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.2 }}
            >
              {activeSection === 'account' && (
                <SettingsCard title={t('dashboard.settings.sectionAccount')}>
                  {/* Profile */}
                  <div className="flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 text-2xl font-bold text-primary-700 dark:bg-primary-900/30 dark:text-primary-400">
                      {user?.avatarUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={user.avatarUrl}
                          alt={user.displayName}
                          className="h-16 w-16 rounded-full object-cover"
                        />
                      ) : (
                        user?.displayName?.charAt(0).toUpperCase() || 'U'
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">{user?.displayName}</h3>
                      <p className="text-sm text-gray-500">{user?.email}</p>
                    </div>
                  </div>

                  <div className="mt-6 space-y-1">
                    {/* Plan info */}
                    <SettingsRow
                      icon={Crown}
                      label={t('dashboard.settings.plan')}
                      value={
                        <Link
                          href="/pricing"
                          className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
                        >
                          {(user?.role as string) === 'admin' ? t('dashboard.settings.planAdmin') : t('dashboard.settings.planFree')}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      }
                    />

                    {/* PWA Install */}
                    {!isInstalled && isInstallable && (
                      <SettingsRow
                        icon={Download}
                        label={t('dashboard.settings.installApp')}
                        value={
                          <button
                            onClick={installApp}
                            className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
                          >
                            {t('dashboard.settings.install')}
                          </button>
                        }
                      />
                    )}
                    {isInstalled && (
                      <SettingsRow
                        icon={Smartphone}
                        label={t('dashboard.settings.pwaStatus')}
                        value={
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="h-4 w-4" /> {t('dashboard.settings.installed')}
                          </span>
                        }
                      />
                    )}

                    {/* Set / change password — needed so Google-OAuth
                        users can log into the desktop and other clients
                        that don't support browser-based sign-in. */}
                    <div className="pt-4">
                      {!showPasswordCard ? (
                        <button
                          onClick={() => setShowPasswordCard(true)}
                          className="flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                        >
                          <Lock className="h-4 w-4" />
                          {t('dashboard.settings.setPassword')}
                        </button>
                      ) : (
                        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                          <div className="mb-3 flex items-start gap-2">
                            <Lock className="mt-0.5 h-4 w-4 text-primary-500" />
                            <div className="text-xs text-gray-600 dark:text-gray-400">
                              {t('dashboard.settings.passwordHint')}
                            </div>
                          </div>
                          <input
                            type="password"
                            placeholder={t('dashboard.settings.newPasswordPlaceholder')}
                            aria-label={t('dashboard.settings.newPasswordLabel')}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="mb-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                            autoComplete="new-password"
                          />
                          <input
                            type="password"
                            placeholder={t('dashboard.settings.confirmPassword')}
                            aria-label={t('dashboard.settings.confirmPassword')}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-600 dark:bg-gray-900"
                            autoComplete="new-password"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSetPassword}
                              disabled={settingPassword || !newPassword || !confirmPassword}
                              className="rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-600 disabled:opacity-50"
                            >
                              {settingPassword ? t('dashboard.settings.savingPassword') : t('dashboard.settings.savePassword')}
                            </button>
                            <button
                              onClick={() => {
                                setShowPasswordCard(false);
                                setNewPassword('');
                                setConfirmPassword('');
                              }}
                              className="rounded-lg border border-gray-300 px-4 py-2 text-sm dark:border-gray-600"
                            >
                              {t('dashboard.shared.cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Sign out */}
                    <div className="pt-4">
                      <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-sm text-red-500 transition-colors hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                        {t('dashboard.settings.signOut')}
                      </button>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'storage' && (
                <SettingsCard title={t('dashboard.settings.sectionStorage')}>
                  {/* Storage bar */}
                  {storage && (
                    <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium">{t('dashboard.settings.used')}</span>
                        <span className="text-sm font-bold">{storage.percentage}%</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${storage.percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                          className={cn(
                            'h-full rounded-full',
                            storage.percentage > 90
                              ? 'bg-red-500'
                              : storage.percentage > 70
                              ? 'bg-yellow-500'
                              : 'bg-primary-500'
                          )}
                        />
                      </div>
                      <div className="mt-3 flex items-center justify-between text-sm text-gray-500">
                        <span>{t('dashboard.settings.usedAmount', { amount: storage.usedFormatted })}</span>
                        <span>{t('dashboard.settings.totalAmount', { amount: storage.limitFormatted })}</span>
                      </div>
                    </div>
                  )}

                  <SubscriptionSection />

                  <div className="mt-4">
                    <Link
                      href="/pricing"
                      className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 p-4 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:hover:bg-primary-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 text-primary-500" />
                        <div>
                          <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                            {t('dashboard.settings.upgradePlan')}
                          </p>
                          <p className="text-xs text-primary-600/70 dark:text-primary-400/70">
                            {t('dashboard.settings.upgradeDesc')}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary-400" />
                    </Link>
                  </div>

                  <div className="mt-6 space-y-1">
                    <SettingsRow
                      icon={Camera}
                      label={t('dashboard.settings.uploadQuality')}
                      value={
                        <select
                          value={settings?.uploadQuality || 'original'}
                          onChange={(e) =>
                            updateSetting('uploadQuality', e.target.value as UserSettings['uploadQuality'])
                          }
                          aria-label={t('dashboard.settings.uploadQuality')}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="original">{t('dashboard.settings.qualityOriginal')}</option>
                          <option value="high">{t('dashboard.settings.qualityHigh')}</option>
                          <option value="medium">{t('dashboard.settings.qualityMedium')}</option>
                        </select>
                      }
                    />
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'referral' && (
                <SettingsCard title={t('dashboard.settings.sectionReferral')}>
                  <div className="mb-6 rounded-xl bg-gradient-to-r from-green-50 to-emerald-50 p-5 dark:from-green-900/20 dark:to-emerald-900/20">
                    <div className="flex items-start gap-3">
                      <Gift className="mt-0.5 h-6 w-6 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="font-semibold text-green-800 dark:text-green-300">
                          {t('dashboard.settings.referralHeadline')}
                        </p>
                        <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                          {t('dashboard.settings.referralBody')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {referralStats && (
                    <>
                      {/* Progress */}
                      <div className="mb-6 rounded-xl bg-gray-50 p-5 dark:bg-gray-800/50">
                        <div className="mb-2 flex items-center justify-between text-sm">
                          <span className="font-medium">
                            {t('dashboard.settings.referralFriends', { count: referralStats.referralCount, max: referralStats.maxReferrals })}
                          </span>
                          <span className="font-bold text-green-600">
                            {t('dashboard.settings.referralBonus', { amount: referralStats.bonusFormatted })}
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{
                              width: `${(referralStats.referralCount / referralStats.maxReferrals) * 100}%`,
                            }}
                            transition={{ duration: 0.8, ease: 'easeOut' }}
                            className="h-full rounded-full bg-green-500"
                          />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">
                          {t('dashboard.settings.referralBonusOf', { amount: referralStats.bonusFormatted, max: referralStats.maxBonusFormatted })}
                        </p>
                      </div>

                      {/* Referral code & link */}
                      <div className="space-y-3">
                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('dashboard.settings.referralCode')}
                          </label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-lg bg-gray-100 px-4 py-2.5 text-lg font-bold tracking-widest dark:bg-gray-700">
                              {referralStats.referralCode}
                            </code>
                            <button
                              onClick={() => copyToClipboard(referralStats.referralCode, 'code')}
                              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-2.5 text-sm font-medium transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
                            >
                              {copied === 'code' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                              {copied === 'code' ? t('dashboard.shared.copied') : t('dashboard.shared.copy')}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('dashboard.settings.referralLink')}
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              readOnly
                              value={referralStats.referralLink}
                              aria-label={t('dashboard.settings.referralLinkLabel')}
                              className="flex-1 rounded-lg bg-gray-100 px-3 py-2.5 text-sm dark:bg-gray-700"
                            />
                            <button
                              onClick={() => copyToClipboard(referralStats.referralLink, 'link')}
                              className="flex items-center gap-1.5 rounded-lg bg-primary-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-600"
                            >
                              {copied === 'link' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              {copied === 'link' ? t('dashboard.shared.copied') : t('dashboard.settings.copyLink')}
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Share buttons */}
                      <div className="mt-6">
                        <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">{t('dashboard.settings.shareVia')}</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={`https://wa.me/?text=${encodeURIComponent(t('dashboard.settings.shareWhatsApp', { link: referralStats.referralLink }))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-600"
                          >
                            <Share2 className="h-4 w-4" />
                            WhatsApp
                          </a>
                          <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(t('dashboard.settings.shareTwitter', { link: referralStats.referralLink }))}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-800 dark:bg-gray-600 dark:hover:bg-gray-500"
                          >
                            <Share2 className="h-4 w-4" />
                            X / Twitter
                          </a>
                          <a
                            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralStats.referralLink)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                          >
                            <Share2 className="h-4 w-4" />
                            Facebook
                          </a>
                          <a
                            href={`mailto:?subject=${encodeURIComponent(t('dashboard.settings.shareEmailSubject'))}&body=${encodeURIComponent(t('dashboard.settings.shareEmailBody', { link: referralStats.referralLink }))}`}
                            className="flex items-center gap-2 rounded-lg bg-gray-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
                          >
                            <Share2 className="h-4 w-4" />
                            Email
                          </a>
                        </div>
                      </div>

                      {/* Referral list */}
                      {referralStats.referrals.length > 0 && (
                        <div className="mt-6">
                          <p className="mb-3 text-sm font-medium text-gray-600 dark:text-gray-400">
                            {t('dashboard.settings.yourReferrals', { count: referralStats.referralCount })}
                          </p>
                          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-50 dark:bg-gray-800">
                                  <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">{t('dashboard.settings.colEmail')}</th>
                                  <th className="px-4 py-2 text-left font-medium text-gray-600 dark:text-gray-400">{t('dashboard.settings.colDate')}</th>
                                  <th className="px-4 py-2 text-right font-medium text-gray-600 dark:text-gray-400">{t('dashboard.settings.colBonus')}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {referralStats.referrals.map((ref, i) => (
                                  <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
                                    <td className="px-4 py-2">{ref.email}</td>
                                    <td className="px-4 py-2 text-gray-500">{ref.date}</td>
                                    {ref.qualified ? (
                                      <td className="px-4 py-2 text-right font-medium text-green-600">+{formatBytes(REFERRAL_BONUS)}</td>
                                    ) : (
                                      <td className="px-4 py-2 text-right text-gray-400">{t('dashboard.settings.referralPending')}</td>
                                    )}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </SettingsCard>
              )}

              {activeSection === 'sync' && (
                <SettingsCard title={t('dashboard.settings.syncTitle')}>
                  <div className="space-y-1">
                    <SettingsRow
                      icon={Cloud}
                      label={t('dashboard.settings.autoBackup')}
                      value={
                        <ToggleSwitch
                          checked={settings?.autoBackup ?? true}
                          onChange={(v) => updateSetting('autoBackup', v)}
                          label={t('dashboard.settings.autoBackup')}
                        />
                      }
                    />

                    <SettingsRow
                      icon={Wifi}
                      label={t('dashboard.settings.uploadMode')}
                      value={
                        <select
                          value={settings?.syncMode || 'wifi_only'}
                          onChange={(e) =>
                            updateSetting('syncMode', e.target.value as UserSettings['syncMode'])
                          }
                          aria-label={t('dashboard.settings.uploadMode')}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="wifi_only">{t('dashboard.settings.wifiOnly')}</option>
                          <option value="wifi_and_mobile">{t('dashboard.settings.wifiAndMobile')}</option>
                          <option value="manual">{t('dashboard.settings.manualUpload')}</option>
                        </select>
                      }
                    />

                    <SettingsRow
                      icon={Globe}
                      label={t('dashboard.settings.roamingUpload')}
                      value={
                        <ToggleSwitch
                          checked={settings?.allowRoaming ?? false}
                          onChange={(v) => updateSetting('allowRoaming', v)}
                          label={t('dashboard.settings.roamingUpload')}
                        />
                      }
                    />
                  </div>

                  {/* PWA sync info */}
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="flex items-start gap-3">
                      <Smartphone className="mt-0.5 h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">{t('dashboard.settings.backgroundSync')}</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {isInstalled
                            ? t('dashboard.settings.bgSyncActive')
                            : t('dashboard.settings.bgSyncInstall')}
                        </p>
                        {!isInstalled && isInstallable && (
                          <button
                            onClick={installApp}
                            className="mt-2 text-xs font-semibold text-primary-500 hover:text-primary-600"
                          >
                            {t('dashboard.settings.installPwa')}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'appearance' && (
                <SettingsCard title={t('dashboard.settings.sectionAppearance')}>
                  <div className="space-y-1">
                    <SettingsRow
                      icon={isDarkMode ? Moon : Sun}
                      label={t('dashboard.settings.darkMode')}
                      value={
                        <ToggleSwitch
                          checked={isDarkMode}
                          onChange={toggleDarkMode}
                          label={t('dashboard.settings.darkMode')}
                        />
                      }
                    />
                    <SettingsRow
                      icon={Globe}
                      label={t('dashboard.settings.language')}
                      value={
                        <select
                          value={locale}
                          onChange={(e) => setLocale(e.target.value as typeof locale)}
                          aria-label={t('dashboard.settings.language')}
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="en">English</option>
                          <option value="sr">Srpski</option>
                        </select>
                      }
                    />
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'privacy' && (
                <SettingsCard title={t('dashboard.settings.privacyTitle')}>
                  <div className="space-y-1">
                    <SettingsRow
                      icon={Shield}
                      label={t('dashboard.settings.faceRecognition')}
                      description={t('dashboard.settings.faceRecognitionDesc')}
                      value={
                        <ToggleSwitch
                          checked={settings?.faceRecognition ?? true}
                          onChange={(v) => updateSetting('faceRecognition', v)}
                          label={t('dashboard.settings.faceRecognition')}
                        />
                      }
                    />
                  </div>

                  <div className="mt-6 space-y-2">
                    <Link
                      href="/privacy"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      {t('dashboard.settings.privacyPolicy')} <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/terms"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      {t('dashboard.settings.terms')} <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <h4 className="mb-2 text-sm font-semibold text-red-600">{t('dashboard.settings.dangerZone')}</h4>
                    <p className="mb-4 text-xs text-gray-500">
                      {t('dashboard.settings.dangerText')}
                    </p>
                    <button onClick={() => setShowDeleteAccount(true)} className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                      {t('dashboard.settings.deleteAccount')}
                    </button>
                  </div>
                </SettingsCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
      {showDeleteAccount && <DeleteAccountDialog onClose={() => setShowDeleteAccount(false)} />}
    </motion.div>
  );
}

function SettingsCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-6 text-lg font-semibold">{title}</h2>
      {children}
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  label,
  description,
  value,
}: {
  icon: any;
  label: string;
  description?: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl px-3 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50">
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 text-gray-400" />
        <div>
          <p className="text-sm font-medium">{label}</p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {value}
    </div>
  );
}

function ToggleSwitch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={cn(
        'relative h-6 w-11 rounded-full transition-colors',
        checked ? 'bg-primary-500' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={cn(
          'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm',
          checked ? 'left-[22px]' : 'left-0.5'
        )}
      />
    </button>
  );
}
