'use client';

import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import { reauthenticate, usesPasswordAuth, signOut } from '@/lib/firebase';
import { useT } from '@/i18n/client';

/**
 * Two-step account deletion: type DELETE, then re-confirm identity (Google
 * popup or password). The server rejects tokens older than 10 minutes, so the
 * re-auth step is what makes the request go through.
 */
export function DeleteAccountDialog({ onClose }: { onClose: () => void }) {
  const [confirmText, setConfirmText] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const needsPassword = usesPasswordAuth();
  const t = useT();

  const canSubmit = confirmText.trim().toUpperCase() === 'DELETE' && (!needsPassword || password.length > 0);

  const handleDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const token = await reauthenticate(needsPassword ? password : undefined);
      const res = await fetch('/api/users/me', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      setDone(true);
      await signOut().catch(() => {});
      setTimeout(() => {
        window.location.href = '/';
      }, 2500);
    } catch (e: any) {
      const code = e?.code as string | undefined;
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError(t('components.deleteAccount.wrongPassword'));
      } else if (code === 'auth/popup-closed-by-user') {
        setError(t('components.deleteAccount.reauthCancelled'));
      } else {
        setError(e?.message || t('components.deleteAccount.failed'));
      }
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-800">
        {done ? (
          <div className="text-center">
            <h3 className="text-lg font-semibold">{t('components.deleteAccount.doneTitle')}</h3>
            <p className="mt-2 text-sm text-gray-500">{t('components.deleteAccount.doneBody')}</p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start justify-between">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" />
                <h3 className="text-lg font-semibold">{t('components.deleteAccount.title')}</h3>
              </div>
              <button onClick={onClose} disabled={busy} aria-label={t('components.common.close')} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {t('components.deleteAccount.warningIntro')}{' '}
              <strong>{t('components.deleteAccount.warningIrreversible')}</strong>{' '}
              {t('components.deleteAccount.warningSubscription')}
            </p>
            <label className="mt-4 block text-sm font-medium">
              {t('components.deleteAccount.typePrefix')}{' '}
              <span className="font-mono text-red-600">DELETE</span>{' '}
              {t('components.deleteAccount.typeSuffix')}
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                autoComplete="off"
              />
            </label>
            {needsPassword && (
              <label className="mt-3 block text-sm font-medium">
                {t('components.deleteAccount.password')}
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-600 dark:bg-gray-900"
                  autoComplete="current-password"
                />
              </label>
            )}
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <div className="mt-6 flex justify-end gap-2">
              <button onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700">
                {t('components.common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={!canSubmit || busy}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                {t('components.deleteAccount.submit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
