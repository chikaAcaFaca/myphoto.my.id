'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import JSZip from 'jszip';
import { AlertTriangle, Archive, CheckCircle, Download, Loader2, Trash2 } from 'lucide-react';
import { formatBytes, getArchiveOffers, type ArchiveOffer } from '@myphoto/shared';
import { getIdToken } from '@/lib/firebase';
import { useStorage } from '@/lib/hooks';
import { useI18n } from '@/i18n/client';

interface ExportItem {
  path: string;
  size: number;
  url: string;
}

/** ZIP fallback keeps each part in memory, so cap it. */
const ZIP_PART_BYTES = 500 * 1024 * 1024;

export default function KeepFilesPage() {
  return (
    <Suspense>
      <KeepFilesContent />
    </Suspense>
  );
}

/**
 * Where the over-quota banner and warning emails send the user: upgrade,
 * buy an archive, download everything, or delete files — before the
 * read-only grace period ends (see lib/over-quota.ts).
 */
function KeepFilesContent() {
  const { t, intlLocale } = useI18n();
  const { data: storage, refetch } = useStorage();
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const eur = (n: number) => new Intl.NumberFormat(intlLocale, { style: 'currency', currency: 'EUR' }).format(n);
  const fmtDate = (d: Date) => d.toLocaleDateString(intlLocale, { day: 'numeric', month: 'long', year: 'numeric' });

  if (!storage) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const over = Math.max(0, storage.used - storage.limit);
  const offers = over > 0 ? getArchiveOffers(storage.used) : [];

  const buyArchive = async (offer: ArchiveOffer) => {
    setBusy(`offer-${offer.months}`);
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/checkout/archive', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ months: offer.months }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error || t('pages.keepFiles.checkoutFailed'));
      window.location.href = data.url;
    } catch (e: any) {
      setError(e.message);
      setBusy(null);
    }
  };

  const downloadAll = async () => {
    setBusy('download');
    setError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/export', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(t('pages.keepFiles.downloadFailed'));
      const { items } = (await res.json()) as { items: ExportItem[] };
      setProgress({ done: 0, total: items.length });

      // Preferred: write straight into a folder the user picks — no memory limit.
      if ('showDirectoryPicker' in window) {
        let root: any = null;
        try {
          root = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
        if (root) {
          let done = 0;
          for (const item of items) {
            const parts = item.path.split('/');
            let dir = root;
            for (const segment of parts.slice(0, -1)) dir = await dir.getDirectoryHandle(segment, { create: true });
            try {
              const fileRes = await fetch(item.url);
              if (fileRes.ok && fileRes.body) {
                const handle = await dir.getFileHandle(parts[parts.length - 1], { create: true });
                await fileRes.body.pipeTo(await handle.createWritable());
              }
            } catch {
              // Skip a failed file; the rest keep going.
            }
            setProgress({ done: ++done, total: items.length });
          }
          return;
        }
      }

      // Fallback: ZIP parts of at most ZIP_PART_BYTES each.
      let done = 0;
      let part = 1;
      let zip = new JSZip();
      let partBytes = 0;
      const flush = async () => {
        if (partBytes === 0) return;
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `myphoto-export-part-${part}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        part++;
        zip = new JSZip();
        partBytes = 0;
      };
      for (const item of items) {
        if (partBytes > 0 && partBytes + item.size > ZIP_PART_BYTES) await flush();
        try {
          const fileRes = await fetch(item.url);
          if (fileRes.ok) {
            zip.file(item.path, await fileRes.blob());
            partBytes += item.size;
          }
        } catch {
          // Skip a failed file.
        }
        setProgress({ done: ++done, total: items.length });
      }
      await flush();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(null);
      refetch();
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <h1 className="text-2xl font-bold">{t('pages.keepFiles.title')}</h1>

      {searchParams.get('archived') && (
        <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950/30">
          <CheckCircle className="h-5 w-5 shrink-0 text-green-500" />
          <p className="text-sm text-green-800 dark:text-green-200">{t('pages.keepFiles.archivedThanks')}</p>
        </div>
      )}

      {/* Status */}
      {storage.overQuotaDeleteAt ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/30">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <p className="font-semibold">
              {t('pages.keepFiles.overBy', { over: formatBytes(over), limit: storage.limitFormatted })}
            </p>
            <p className="mt-1">{t('pages.keepFiles.deleteOn', { date: fmtDate(storage.overQuotaDeleteAt) })}</p>
          </div>
        </div>
      ) : storage.archiveUntil ? (
        <p className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
          {t('pages.keepFiles.archiveActive', { date: fmtDate(storage.archiveUntil) })}
        </p>
      ) : (
        <p className="rounded-xl bg-gray-50 p-4 text-sm dark:bg-gray-800/50">
          {t('pages.keepFiles.allFits', { used: storage.usedFormatted, limit: storage.limitFormatted })}
        </p>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Keep: plan or archive */}
      {offers.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <Archive className="h-5 w-5 text-primary-500" />
            {t('pages.keepFiles.keepTitle')}
          </h2>
          <p className="mb-3 text-sm text-gray-500">{t('pages.keepFiles.keepBody')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {offers.map((offer) => (
              <div key={offer.months} className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
                <p className="text-sm text-gray-500">{t('pages.keepFiles.months', { count: offer.months })}</p>
                <p className="text-2xl font-bold">{eur(offer.price)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  {offer.kind === 'plan'
                    ? t('pages.keepFiles.planBetter', { plan: `${offer.tier.name} · ${offer.tier.storageDisplay}` })
                    : t('pages.keepFiles.archiveDesc')}
                </p>
                {offer.kind === 'plan' ? (
                  <Link
                    href={`/checkout?tier=${offer.tier.tier}&period=${offer.period}`}
                    className="btn-primary mt-3 block text-center text-sm"
                  >
                    {t('pages.keepFiles.choosePlan')}
                  </Link>
                ) : (
                  <button
                    onClick={() => buyArchive(offer)}
                    disabled={!!busy}
                    className="btn-secondary mt-3 flex w-full items-center justify-center gap-2 text-sm"
                  >
                    {busy === `offer-${offer.months}` && <Loader2 className="h-4 w-4 animate-spin" />}
                    {t('pages.keepFiles.buyArchive')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Download everything */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Download className="h-5 w-5 text-primary-500" />
          {t('pages.keepFiles.downloadTitle')}
        </h2>
        <p className="mb-3 text-sm text-gray-500">{t('pages.keepFiles.downloadBody')}</p>
        <button onClick={downloadAll} disabled={!!busy} className="btn-primary flex items-center gap-2 text-sm">
          {busy === 'download' && <Loader2 className="h-4 w-4 animate-spin" />}
          {t('pages.keepFiles.downloadButton')}
        </button>
        {progress && (
          <p className="mt-2 text-sm text-gray-500">
            {t('pages.keepFiles.progress', { done: progress.done, total: progress.total })}
          </p>
        )}
      </section>

      {/* Delete files */}
      <section className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
        <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Trash2 className="h-5 w-5 text-primary-500" />
          {t('pages.keepFiles.deleteTitle')}
        </h2>
        <p className="mb-3 text-sm text-gray-500">{t('pages.keepFiles.deleteBody')}</p>
        <div className="flex flex-wrap gap-2">
          <Link href="/photos" className="btn-secondary text-sm">{t('pages.keepFiles.openPhotos')}</Link>
          <Link href="/myspace" className="btn-secondary text-sm">{t('pages.keepFiles.openMySpace')}</Link>
        </div>
      </section>
    </div>
  );
}
