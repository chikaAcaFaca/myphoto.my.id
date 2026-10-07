'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Cloud,
  ArrowLeft,
  HelpCircle,
  User,
  CreditCard,
  Upload,
  Share2,
  Brain,
  Shield,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/translate';

const FAQ_CATEGORIES = [
  { id: 'account', icon: <User className="h-5 w-5" />, questions: ['create', 'password', 'delete', 'devices'] },
  { id: 'billing', icon: <CreditCard className="h-5 w-5" />, questions: ['plans', 'cancel', 'periods', 'methods'] },
  { id: 'storage', icon: <Upload className="h-5 w-5" />, questions: ['formats', 'compression', 'full', 'export'] },
  { id: 'sharing', icon: <Share2 className="h-5 w-5" />, questions: ['share', 'family', 'control'] },
  { id: 'ai', icon: <Brain className="h-5 w-5" />, questions: ['smartSearch', 'training', 'faces'] },
  { id: 'privacy', icon: <Shield className="h-5 w-5" />, questions: ['location', 'gdpr', 'access'] },
] as const;

export default function SupportPage() {
  const t = useT();
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({});

  const toggleItem = (key: string) => {
    setOpenItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Cloud className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold">MyPhoto</span>
          </Link>
          <Link href="/" className="btn-ghost flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('pages.shell.home')}
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-12 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
          <HelpCircle className="h-8 w-8 text-primary-600 dark:text-primary-400" />
        </div>
        <h1 className="mb-2 text-4xl font-bold">{t('pages.support.title')}</h1>
        <p className="text-gray-600 dark:text-gray-300">
          {t('pages.support.subtitle')}
        </p>
      </section>

      {/* FAQ Sections */}
      <main className="container mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-8">
          {FAQ_CATEGORIES.map((category) => (
            <div key={category.id}>
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                  {category.icon}
                </div>
                <h2 className="text-xl font-bold">{t(`pages.support.categories.${category.id}` as MessageKey)}</h2>
              </div>
              <div className="space-y-2">
                {category.questions.map((qid) => {
                  const key = `${category.id}-${qid}`;
                  const item = {
                    q: t(`pages.support.faq.${category.id}.${qid}.q` as MessageKey),
                    a: t(`pages.support.faq.${category.id}.${qid}.a` as MessageKey),
                  };
                  const isOpen = openItems[key];
                  return (
                    <div
                      key={key}
                      className="rounded-lg bg-white shadow-sm dark:bg-gray-800"
                    >
                      <button
                        onClick={() => toggleItem(key)}
                        className="flex w-full items-center justify-between px-5 py-4 text-left"
                      >
                        <span className="font-medium">{item.q}</span>
                        {isOpen ? (
                          <ChevronUp className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                      </button>
                      {isOpen && (
                        <div className="border-t border-gray-100 px-5 pb-4 pt-3 dark:border-gray-700">
                          <p className="text-sm text-gray-600 dark:text-gray-300">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">{t('pages.support.ctaTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            {t('pages.support.ctaText')}
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            {t('pages.support.ctaButton')}
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto mt-16 border-t border-gray-200 px-4 py-8 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Cloud className="h-6 w-6 text-primary-500" />
            <span className="font-semibold">MyPhoto</span>
          </div>
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} MyPhoto. {t('pages.shell.rights')}
          </p>
          <div className="flex gap-4 text-sm text-gray-500">
            <Link href="/privacy" className="hover:text-primary-500">{t('pages.shell.privacy')}</Link>
            <Link href="/terms" className="hover:text-primary-500">{t('pages.shell.terms')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.shell.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
