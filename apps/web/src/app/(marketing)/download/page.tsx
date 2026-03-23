import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Preuzmi MyCameraBackup aplikaciju — Desktop, Android, iOS',
  description: 'Preuzmite MyCameraBackup aplikaciju za automatsku sinhronizaciju fajlova na računaru, Android telefonu ili tabletu.',
};

export default function DownloadPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="text-4xl font-bold">Preuzmite MyCameraBackup</h1>
        <p className="mt-4 text-lg text-gray-600">
          Sinhronizujte fajlove automatski na svim uređajima
        </p>
      </div>

      <div className="mt-12 grid gap-8 md:grid-cols-3">
        {/* Windows */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-3xl">
            🖥️
          </div>
          <h2 className="text-xl font-bold">Windows</h2>
          <p className="mt-2 text-sm text-gray-500">
            Desktop aplikacija sa automatskom sinhronizacijom fajlova, kao Dropbox
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>✓ Automatski prati promene</li>
            <li>✓ Radi u pozadini (system tray)</li>
            <li>✓ Sinhronizuje foldere</li>
            <li>✓ Pokreće se sa Windowsom</li>
          </ul>
          <a
            href="/downloads/MyCameraBackup-Setup.exe"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-blue-700"
          >
            ⬇️ Preuzmi za Windows
          </a>
          <p className="mt-2 text-xs text-gray-400">Windows 10/11 · 64-bit</p>
        </div>

        {/* Android */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-green-50 text-3xl">
            📱
          </div>
          <h2 className="text-xl font-bold">Android</h2>
          <p className="mt-2 text-sm text-gray-500">
            Mobilna aplikacija za telefon i tablet sa automatskim backup-om fotografija
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>✓ Auto-backup fotografija</li>
            <li>✓ Pristup svim fajlovima</li>
            <li>✓ Offline pregled</li>
            <li>✓ Deljenje slika</li>
          </ul>
          <a
            href="/downloads/MyCameraBackup.apk"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-green-700"
          >
            ⬇️ Preuzmi APK
          </a>
          <p className="mt-2 text-xs text-gray-400">
            Android 8.0+ ·{' '}
            <span className="text-green-600">Uskoro na Google Play</span>
          </p>
        </div>

        {/* Web / PWA */}
        <div className="rounded-2xl border border-gray-200 p-8 text-center transition-shadow hover:shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-50 text-3xl">
            🌐
          </div>
          <h2 className="text-xl font-bold">Web App</h2>
          <p className="mt-2 text-sm text-gray-500">
            Instalirajte direktno iz pregledača, radi na svim platformama
          </p>
          <ul className="mt-4 space-y-2 text-left text-sm text-gray-600">
            <li>✓ Radi offline</li>
            <li>✓ Nema instalacije</li>
            <li>✓ Chrome, Edge, Safari</li>
            <li>✓ Automatska ažuriranja</li>
          </ul>
          <Link
            href="/login"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-purple-700"
          >
            🚀 Otvori Web App
          </Link>
          <p className="mt-2 text-xs text-gray-400">Instalacija iz pregledača</p>
        </div>
      </div>

      {/* How sync works */}
      <div className="mt-20">
        <h2 className="text-center text-2xl font-bold">Kako radi sinhronizacija?</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">1</div>
            <h3 className="font-semibold">Instalirajte</h3>
            <p className="mt-1 text-sm text-gray-500">Preuzmite i instalirajte aplikaciju</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">2</div>
            <h3 className="font-semibold">Prijavite se</h3>
            <p className="mt-1 text-sm text-gray-500">Koristite vaš MyCameraBackup nalog</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">3</div>
            <h3 className="font-semibold">Izaberite folder</h3>
            <p className="mt-1 text-sm text-gray-500">Odredite koji folder da se prati</p>
          </div>
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-xl font-bold text-indigo-600">4</div>
            <h3 className="font-semibold">Automatski sync</h3>
            <p className="mt-1 text-sm text-gray-500">Svaka promena se šalje u oblak</p>
          </div>
        </div>
      </div>
    </div>
  );
}
