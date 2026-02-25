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
} from 'lucide-react';
import { useAuthStore, useUIStore } from '@/lib/stores';
import { useStorage, usePWA } from '@/lib/hooks';
import { updateUserSettings } from '@/lib/firebase';
import { syncSettingsToIDB } from '@/lib/upload-queue';
import type { UserSettings } from '@myphoto/shared';
import { cn } from '@/lib/utils';
import Link from 'next/link';

type SettingsSection = 'account' | 'storage' | 'sync' | 'appearance' | 'privacy';

export default function SettingsPage() {
  const { user, firebaseUser, signOut } = useAuthStore();
  const { isDarkMode, toggleDarkMode, addNotification } = useUIStore();
  const { data: storage } = useStorage();
  const { isInstalled, isInstallable, installApp } = usePWA();
  const [activeSection, setActiveSection] = useState<SettingsSection>('account');
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [saving, setSaving] = useState(false);

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
      addNotification({ type: 'success', title: 'Sačuvano', message: 'Podešavanje je ažurirano' });
    } catch {
      setSettings(settings); // revert
      addNotification({ type: 'error', title: 'Greška', message: 'Nije moguće sačuvati podešavanje' });
    } finally {
      setSaving(false);
    }
  };

  const sections: { id: SettingsSection; label: string; icon: any }[] = [
    { id: 'account', label: 'Nalog', icon: User },
    { id: 'storage', label: 'Skladište', icon: HardDrive },
    { id: 'sync', label: 'Sinhronizacija', icon: Cloud },
    { id: 'appearance', label: 'Izgled', icon: Palette },
    { id: 'privacy', label: 'Privatnost', icon: Shield },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      <h1 className="mb-6 text-2xl font-bold">Podešavanja</h1>

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
                <SettingsCard title="Nalog">
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
                      label="Plan"
                      value={
                        <Link
                          href="/pricing"
                          className="flex items-center gap-1 text-sm font-medium text-primary-500 hover:text-primary-600"
                        >
                          {(user?.role as string) === 'admin' ? 'Admin' : 'Free'}
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      }
                    />

                    {/* PWA Install */}
                    {!isInstalled && isInstallable && (
                      <SettingsRow
                        icon={Download}
                        label="Instaliraj aplikaciju"
                        value={
                          <button
                            onClick={installApp}
                            className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
                          >
                            Instaliraj
                          </button>
                        }
                      />
                    )}
                    {isInstalled && (
                      <SettingsRow
                        icon={Smartphone}
                        label="PWA status"
                        value={
                          <span className="flex items-center gap-1 text-sm text-green-600">
                            <Check className="h-4 w-4" /> Instalirano
                          </span>
                        }
                      />
                    )}

                    {/* Sign out */}
                    <div className="pt-4">
                      <button
                        onClick={signOut}
                        className="flex items-center gap-2 text-sm text-red-500 transition-colors hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4" />
                        Odjavi se
                      </button>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'storage' && (
                <SettingsCard title="Skladište">
                  {/* Storage bar */}
                  {storage && (
                    <div className="rounded-2xl bg-gray-50 p-5 dark:bg-gray-800/50">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium">Iskorišćeno</span>
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
                        <span>{storage.usedFormatted} korišćeno</span>
                        <span>{storage.limitFormatted} ukupno</span>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <Link
                      href="/pricing"
                      className="flex items-center justify-between rounded-xl border border-primary-200 bg-primary-50 p-4 transition-colors hover:bg-primary-100 dark:border-primary-800 dark:bg-primary-900/20 dark:hover:bg-primary-900/30"
                    >
                      <div className="flex items-center gap-3">
                        <Crown className="h-5 w-5 text-primary-500" />
                        <div>
                          <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">
                            Nadogradi plan
                          </p>
                          <p className="text-xs text-primary-600/70 dark:text-primary-400/70">
                            Do 2TB skladišta + AI funkcije
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-primary-400" />
                    </Link>
                  </div>

                  <div className="mt-6 space-y-1">
                    <SettingsRow
                      icon={Camera}
                      label="Kvalitet uploada"
                      value={
                        <select
                          value={settings?.uploadQuality || 'original'}
                          onChange={(e) =>
                            updateSetting('uploadQuality', e.target.value as UserSettings['uploadQuality'])
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="original">Originalni kvalitet</option>
                          <option value="high">Visoki kvalitet</option>
                          <option value="medium">Srednji kvalitet</option>
                        </select>
                      }
                    />
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'sync' && (
                <SettingsCard title="Sinhronizacija i backup">
                  <div className="space-y-1">
                    <SettingsRow
                      icon={Cloud}
                      label="Automatski backup"
                      value={
                        <ToggleSwitch
                          checked={settings?.autoBackup ?? true}
                          onChange={(v) => updateSetting('autoBackup', v)}
                        />
                      }
                    />

                    <SettingsRow
                      icon={Wifi}
                      label="Upload režim"
                      value={
                        <select
                          value={settings?.syncMode || 'wifi_only'}
                          onChange={(e) =>
                            updateSetting('syncMode', e.target.value as UserSettings['syncMode'])
                          }
                          className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-700 dark:bg-gray-800"
                        >
                          <option value="wifi_only">Samo WiFi</option>
                          <option value="wifi_and_mobile">WiFi + Mobilni</option>
                          <option value="manual">Ručni upload</option>
                        </select>
                      }
                    />

                    <SettingsRow
                      icon={Globe}
                      label="Upload u romingu"
                      value={
                        <ToggleSwitch
                          checked={settings?.allowRoaming ?? false}
                          onChange={(v) => updateSetting('allowRoaming', v)}
                        />
                      }
                    />
                  </div>

                  {/* PWA sync info */}
                  <div className="mt-6 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                    <div className="flex items-start gap-3">
                      <Smartphone className="mt-0.5 h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium">Background Sync</p>
                        <p className="mt-1 text-xs text-gray-500">
                          {isInstalled
                            ? 'Background sync je aktivan. Fajlovi će se uploadovati i kada nije aktivan tab.'
                            : 'Instalirajte aplikaciju kao PWA za automatski background sync čak i kada je pretraživač zatvoren.'}
                        </p>
                        {!isInstalled && isInstallable && (
                          <button
                            onClick={installApp}
                            className="mt-2 text-xs font-semibold text-primary-500 hover:text-primary-600"
                          >
                            Instaliraj PWA
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'appearance' && (
                <SettingsCard title="Izgled">
                  <div className="space-y-1">
                    <SettingsRow
                      icon={isDarkMode ? Moon : Sun}
                      label="Tamni režim"
                      value={
                        <ToggleSwitch
                          checked={isDarkMode}
                          onChange={toggleDarkMode}
                        />
                      }
                    />
                  </div>
                </SettingsCard>
              )}

              {activeSection === 'privacy' && (
                <SettingsCard title="Privatnost i sigurnost">
                  <div className="space-y-1">
                    <SettingsRow
                      icon={Shield}
                      label="Prepoznavanje lica"
                      description="Automatsko grupisanje slika po osobama"
                      value={
                        <ToggleSwitch
                          checked={settings?.faceRecognition ?? true}
                          onChange={(v) => updateSetting('faceRecognition', v)}
                        />
                      }
                    />
                  </div>

                  <div className="mt-6 space-y-2">
                    <Link
                      href="/privacy"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      Politika privatnosti <ChevronRight className="h-4 w-4" />
                    </Link>
                    <Link
                      href="/terms"
                      className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                    >
                      Uslovi korišćenja <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>

                  <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
                    <h4 className="mb-2 text-sm font-semibold text-red-600">Zona opasnosti</h4>
                    <p className="mb-4 text-xs text-gray-500">
                      Ove akcije su nepovratne. Dobro razmislite pre nego što nastavite.
                    </p>
                    <button className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20">
                      <Trash2 className="h-4 w-4" />
                      Obriši nalog i sve podatke
                    </button>
                  </div>
                </SettingsCard>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
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

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
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
