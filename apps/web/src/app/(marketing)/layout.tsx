import Link from 'next/link';
import { Cloud } from 'lucide-react';
import { cookies } from 'next/headers';
import { getT } from '@/i18n/server';
import { LanguageSwitcher } from '@/components/layout/language-switcher';

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Check if user has auth cookie to show correct nav buttons
  const cookieStore = await cookies();
  const isLoggedIn = cookieStore.has('__session') || cookieStore.has('auth_token');
  const t = await getT();
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
              {t('marketing.nav.backup')}
            </Link>
            <Link href="/features/private-storage" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.privacy')}
            </Link>
            <Link href="/features/photo-sharing" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.sharing')}
            </Link>
            <Link href="/compare/google-photos" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.compare')}
            </Link>
            <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.pricing')}
            </Link>
            <Link href="/meme-wall/start" className="text-sm font-medium text-orange-500 hover:text-orange-600">
              {t('marketing.nav.memeWall')}
            </Link>
            <Link href="/download" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.download')}
            </Link>
            <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
              {t('marketing.nav.blog')}
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {isLoggedIn ? (
              <Link
                href="/photos"
                className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
              >
                {t('marketing.nav.openApp')}
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
                  {t('marketing.nav.login')}
                </Link>
                <Link
                  href="/register"
                  className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700"
                >
                  {t('marketing.nav.freeAccount')}
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
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('marketing.footer.product')}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/features/photo-backup" className="hover:text-primary-600">{t('marketing.footer.autoBackup')}</Link></li>
                <li><Link href="/features/private-storage" className="hover:text-primary-600">{t('marketing.footer.privateStorage')}</Link></li>
                <li><Link href="/features/photo-sharing" className="hover:text-primary-600">{t('marketing.footer.photoSharing')}</Link></li>
                <li><Link href="/pricing" className="hover:text-primary-600">{t('marketing.footer.pricing')}</Link></li>
                <li><Link href="/download" className="hover:text-primary-600">{t('marketing.footer.download')}</Link></li>
                <li><Link href="/meme-wall/start" className="hover:text-primary-600">{t('marketing.footer.memeWall')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('marketing.footer.compare')}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/compare/google-photos" className="hover:text-primary-600">{t('marketing.footer.vsGoogle')}</Link></li>
                <li><Link href="/compare/icloud" className="hover:text-primary-600">{t('marketing.footer.vsIcloud')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('marketing.footer.resources')}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/blog" className="hover:text-primary-600">{t('marketing.footer.blog')}</Link></li>
                <li><Link href="/support" className="hover:text-primary-600">{t('marketing.footer.support')}</Link></li>
                <li><Link href="/contact" className="hover:text-primary-600">{t('marketing.footer.contact')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">{t('marketing.footer.legal')}</h4>
              <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li><Link href="/privacy" className="hover:text-primary-600">{t('marketing.footer.privacy')}</Link></li>
                <li><Link href="/terms" className="hover:text-primary-600">{t('marketing.footer.terms')}</Link></li>
                <li><Link href="/refund" className="hover:text-primary-600">{t('marketing.footer.refund')}</Link></li>
              </ul>
            </div>
          </div>
          <div className="mt-8 border-t border-gray-200 pt-8 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
            {t('marketing.footer.copyright', { year: new Date().getFullYear() })}
          </div>
        </div>
      </footer>
    </div>
  );
}
