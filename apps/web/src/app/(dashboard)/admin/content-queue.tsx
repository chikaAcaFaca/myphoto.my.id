'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getIdToken } from '@/lib/firebase';

/** /admin section: social videos (render → approve → post), see lib/content-pipeline.ts. */

interface Item {
  id: string;
  order: number;
  series: string;
  title: string;
  script: string;
  caption: string;
  status: string;
  error: string | null;
  postErrors: Record<string, string> | null;
  results: Record<string, any> | null;
  postedAt: number | null;
  videoUrl: string | null;
}

interface Data {
  paused: boolean;
  autoApproveFrom: string;
  channels: { heygen: boolean; tiktokYoutube: boolean; facebookInstagram: boolean };
  items: Item[];
}

const STATUS: Record<string, { label: string; color: string }> = {
  queued: { label: 'Čeka', color: '#64748b' },
  rendering: { label: 'Pravi se video', color: '#0ea5e9' },
  ready: { label: 'Čeka tvoje odobrenje', color: '#f59e0b' },
  approved: { label: 'Odobren, ide sledeći', color: '#22c55e' },
  posted: { label: 'Objavljen', color: '#16a34a' },
  rejected: { label: 'Odbijen', color: '#94a3b8' },
  failed: { label: 'Greška', color: '#ef4444' },
};

export function ContentQueue() {
  const [data, setData] = useState<Data | null>(null);
  const [busy, setBusy] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = await getIdToken();
    const res = await fetch('/api/admin/content', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setData(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (action: string, id?: string) => {
    setBusy(`${action}:${id || ''}`);
    try {
      const token = await getIdToken();
      await fetch('/api/admin/content', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, id }),
      });
      await load();
    } finally {
      setBusy('');
    }
  };

  if (!data) return <Loader2 className="h-5 w-5 animate-spin" />;
  const ch = data.channels;
  const autoFrom = new Date(data.autoApproveFrom);
  const waiting = data.items.filter((i) => i.status === 'ready');

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-semibold">Videi za mreže</h2>
        <button
          onClick={() => act(data.paused ? 'resume' : 'pause')}
          disabled={!!busy}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold text-white ${data.paused ? 'bg-green-600' : 'bg-gray-600'}`}
        >
          {data.paused ? 'Pokreni ponovo' : 'Zaustavi sve'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {[
          ['HeyGen (video)', ch.heygen],
          ['TikTok + YouTube (Zernio)', ch.tiktokYoutube],
          ['Facebook + Instagram (Meta)', ch.facebookInstagram],
        ].map(([label, ok]) => (
          <span
            key={label as string}
            className={`rounded-full px-2 py-1 ${ok ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}
          >
            {ok ? '✓' : '○'} {label as string}
          </span>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        {data.paused
          ? 'Zaustavljeno: ništa se ne pravi i ne objavljuje.'
          : Date.now() < autoFrom.getTime()
            ? `Do ${autoFrom.toLocaleDateString('sr-Latn-RS')} svaki video čeka tvoje odobrenje. Posle toga ide sam.`
            : 'Videi se objavljuju sami (pon, sre, pet, ned).'}
        {waiting.length > 0 && <strong className="ml-1 text-amber-600">Čeka odobrenje: {waiting.length}</strong>}
      </p>

      <ul className="divide-y rounded-xl border dark:divide-gray-800 dark:border-gray-800">
        {data.items.map((it) => {
          const st = STATUS[it.status] || STATUS.queued;
          const expanded = open === it.id || it.status === 'ready';
          return (
            <li key={it.id} className="p-3">
              <button className="flex w-full items-center justify-between gap-2 text-left" onClick={() => setOpen(open === it.id ? null : it.id)}>
                <span className="text-sm">
                  <span className="mr-2 text-gray-400">{it.order}.</span>
                  {it.title}
                </span>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ background: st.color }}>
                  {st.label}
                </span>
              </button>
              {expanded && (
                <div className="mt-3 grid gap-3 md:grid-cols-[200px_1fr]">
                  {it.videoUrl ? (
                    <video src={it.videoUrl} controls playsInline className="w-full max-w-[200px] rounded-lg bg-black" />
                  ) : (
                    <div className="hidden md:block" />
                  )}
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700 dark:text-gray-300">{it.script}</p>
                    <p className="text-xs text-gray-500">{it.caption}</p>
                    {it.error && <p className="text-xs text-red-600">{it.error}</p>}
                    {it.postErrors &&
                      Object.entries(it.postErrors).map(([k, v]) => (
                        <p key={k} className="text-xs text-red-600">
                          {k}: {v}
                        </p>
                      ))}
                    <div className="flex flex-wrap gap-2">
                      {it.status === 'ready' && (
                        <>
                          <button onClick={() => act('approve', it.id)} disabled={!!busy} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white">
                            Objavi
                          </button>
                          <button onClick={() => act('reject', it.id)} disabled={!!busy} className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm font-semibold dark:bg-gray-700">
                            Odbij
                          </button>
                        </>
                      )}
                      {(it.status === 'failed' || it.status === 'rejected') && (
                        <button onClick={() => act('retry', it.id)} disabled={!!busy} className="rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold text-white">
                          Napravi ponovo
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
