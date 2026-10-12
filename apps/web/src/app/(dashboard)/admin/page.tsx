'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { getIdToken } from '@/lib/firebase';

/**
 * Owner-only funnel (Serbian only: one reader). Data from /api/admin/funnel,
 * which returns 403 for everyone except users.role === 'admin'.
 */

interface Funnel {
  generatedAt: string;
  total: {
    users: number; new7: number; new30: number; backup: number; referred: number; over60: number;
    full: number; paying: number; optedOut: number; downloads30: number; memes: number;
    referrals: number; qualifiedReferrals: number;
  };
  referralSources: Record<string, number>;
  cohorts: Array<{ week: string; signups: number; backup: number; referred: number; over60: number; paying: number }>;
  downloads: Array<{ day: string; apk: number; withRef: number }>;
  revenueYearly: number;
}

const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : '–');

export default function AdminPage() {
  const [data, setData] = useState<Funnel | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        const res = await fetch('/api/admin/funnel', { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error(res.status === 403 ? 'Nemaš pristup ovoj stranici.' : `Greška ${res.status}`);
        setData(await res.json());
      } catch (e: any) {
        setError(e?.message || 'Greška');
      }
    })();
  }, []);

  if (error) return <p className="p-6 text-red-600">{error}</p>;
  if (!data) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  const t = data.total;
  const steps: Array<[string, number, string?]> = [
    ['Preuzimanja APK-a (30 dana)', t.downloads30, 'broji se od 12. 10. 2026'],
    ['Registrovani korisnici', t.users],
    ['Pokrenuli backup', t.backup],
    ['Došli preko preporuke', t.referred],
    ['Prostor ≥ 60%', t.over60],
    ['Prostor pun', t.full],
    ['Plaćaju', t.paying],
  ];

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-bold">Pregled</h1>
        <p className="text-sm text-gray-500">Stanje: {new Date(data.generatedAt).toLocaleString('sr-Latn-RS')}</p>
      </div>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ['Novi (7 dana)', t.new7],
          ['Novi (30 dana)', t.new30],
          ['Godišnji prihod', `€${data.revenueYearly.toFixed(2)}`],
          ['Mimova ukupno', t.memes],
        ].map(([label, value]) => (
          <div key={label as string} className="rounded-xl border p-4 dark:border-gray-700">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Tok korisnika</h2>
        <table className="w-full text-sm">
          <tbody>
            {steps.map(([label, n, note], i) => (
              <tr key={label} className="border-b dark:border-gray-800">
                <td className="py-2">
                  {label}
                  {note && <span className="ml-2 text-xs text-gray-400">({note})</span>}
                </td>
                <td className="py-2 text-right font-semibold">{n}</td>
                <td className="w-24 py-2 text-right text-gray-500">{i > 1 ? pct(n, t.users) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-2 text-xs text-gray-500">
          Procenti su u odnosu na sve registrovane. Preporuke: {t.referrals} ukupno, {t.qualifiedReferrals} ispunile
          uslov (100 MB). Odjavljeni sa mejlova: {t.optedOut}.
        </p>
      </section>

      <section>
        <h2 className="mb-2 font-semibold">Po nedelji registracije</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-gray-500 dark:border-gray-800">
                <th className="py-2">Nedelja od</th>
                <th className="py-2 text-right">Novi</th>
                <th className="py-2 text-right">Backup</th>
                <th className="py-2 text-right">Preporuka</th>
                <th className="py-2 text-right">≥60%</th>
                <th className="py-2 text-right">Plaćaju</th>
              </tr>
            </thead>
            <tbody>
              {data.cohorts.map((c) => (
                <tr key={c.week} className="border-b dark:border-gray-800">
                  <td className="py-2">{c.week}</td>
                  <td className="py-2 text-right font-semibold">{c.signups}</td>
                  <td className="py-2 text-right">{c.backup} <span className="text-gray-400">{pct(c.backup, c.signups)}</span></td>
                  <td className="py-2 text-right">{c.referred}</td>
                  <td className="py-2 text-right">{c.over60}</td>
                  <td className="py-2 text-right">{c.paying}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="mb-2 font-semibold">Odakle dolaze preporuke</h2>
          {Object.keys(data.referralSources).length === 0 ? (
            <p className="text-sm text-gray-500">Još nema.</p>
          ) : (
            <ul className="text-sm">
              {Object.entries(data.referralSources).map(([src, n]) => (
                <li key={src} className="flex justify-between border-b py-1 dark:border-gray-800">
                  <span>{src}</span>
                  <span className="font-semibold">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h2 className="mb-2 font-semibold">Preuzimanja po danu</h2>
          {data.downloads.length === 0 ? (
            <p className="text-sm text-gray-500">Još nema.</p>
          ) : (
            <ul className="text-sm">
              {data.downloads.slice(-14).map((d) => (
                <li key={d.day} className="flex justify-between border-b py-1 dark:border-gray-800">
                  <span>{d.day}</span>
                  <span>
                    <span className="font-semibold">{d.apk}</span>
                    <span className="ml-2 text-gray-400">preko linka: {d.withRef}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
