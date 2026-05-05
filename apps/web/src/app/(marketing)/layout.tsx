import Link from 'next/link';
import { Cloud } from 'lucide-react';
import { cookies } from 'next/headers';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user has auth cookie to show correct nav buttons
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has('__session') || cookieStore.has('auth_token');
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Navbar */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-950/80">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-7 w-7 text-primary-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">
              MyPhoto<span className="text-primary-500">my.space</span>
            </span>
          </Link>

          <div className="hidden items-center gap-6 md:flex">
            <Link href="/features/photo-backup" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Backup
            </Link>
            <Link href="/features/private-storage" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Privatnost
            </Link>
            <Link href="/features/photo-sharing" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Deljenje
            </Link>
            <Link href="/compare/google-photos" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Poređenje
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Cene
            </Link>
            <Link href="/meme-wall" className="text-sm font-medium text-orange-500 hover:text-orange-600">
              🔥 MemeWall
            </Link>
            <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Download
            </Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              Blog
            </Link>
          </div>

          <div className="flex items-center gap-3">
            {isLoggedIn ? (
              <Link
                href="/photos"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                Otvori App
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  Prijava
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  Besplatan nalog
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      {/* Content */}
      <main>{children}</main>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Proizvod</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/features/photo-backup" className="hover:text-primary-600">Auto Backup</Link></li>
                <li><Link href="/features/private-storage" className="hover:text-primary-600">Privatni Storage</Link></li>
                <li><Link href="/features/photo-sharing" className="hover:text-primary-600">Deljenje Slika</Link></li>
                <li><Link href="/pricing" className="hover:text-primary-600">Cene</Link></li>
                <li><Link href="/download" className="hover:text-primary-600">Download</Link></li>
                <li><Link href="/meme-wall" className="hover:text-primary-600">MemeWall</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Poređenje</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/compare/google-photos" className="hover:text-primary-600">vs Google Photos</Link></li>
                <li><Link href="/compare/icloud" className="hover:text-primary-600">vs iCloud</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Resursi</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/blog" className="hover:text-primary-600">Blog</Link></li>
                <li><Link href="/support" className="hover:text-primary-600">Podrška</Link></li>
                <li><Link href="/contact" className="hover:text-primary-600">Kontakt</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Pravno</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/privacy" className="hover:text-primary-600">Privatnost</Link></li>
                <li><Link href="/terms" className="hover:text-primary-600">Uslovi korišćenja</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            © {new Date().getFullYear()} MyPhoto (myphotomy.space) — NASRM Kapetan Bogdan Studio. EU serveri, GDPR zaštita.
          </div>
        </div>
      </footer>
    </div>
  );
}
