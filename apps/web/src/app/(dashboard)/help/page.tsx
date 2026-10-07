'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle,
  Upload,
  FolderOpen,
  Share2,
  Search,
  Shield,
  Smartphone,
  CreditCard,
  ChevronDown,
  ExternalLink,
  MessageCircle,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useT } from '@/i18n/client';
import type { MessageKey } from '@/i18n/translate';

interface FAQItem {
  question: string;
  answer: string;
}

/** Category ids and FAQ counts; text lives in dashboard.help.categories.<id>. */
const categories = [
  { id: 'upload', icon: Upload, faqCount: 3 },
  { id: 'albums', icon: FolderOpen, faqCount: 2 },
  { id: 'sharing', icon: Share2, faqCount: 3 },
  { id: 'search', icon: Search, faqCount: 2 },
  { id: 'privacy', icon: Shield, faqCount: 2 },
  { id: 'mobile', icon: Smartphone, faqCount: 2 },
  { id: 'billing', icon: CreditCard, faqCount: 2 },
] as const;

export default function HelpPage() {
  const [openCategory, setOpenCategory] = useState<string>('upload');
  const [openFAQ, setOpenFAQ] = useState<string | null>(null);
  const t = useT();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-bold">{t('dashboard.help.title')}</h1>
        <p className="mt-1 text-sm text-gray-500">
          {t('dashboard.help.subtitle')}
        </p>
      </div>

      {/* Contact CTA */}
      <div className="mb-8 flex items-center gap-4 rounded-2xl border border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-900/20">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 dark:bg-primary-900/30">
          <MessageCircle className="h-6 w-6 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-primary-700 dark:text-primary-400">{t('dashboard.help.needHelp')}</p>
          <p className="text-xs text-primary-600/70 dark:text-primary-400/70">
            {t('dashboard.help.responseTime')}
          </p>
        </div>
        <Link
          href="/contact"
          className="flex items-center gap-1 rounded-xl bg-primary-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-primary-600 active:scale-95"
        >
          {t('dashboard.help.contact')}
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* FAQ Categories */}
      <div className="space-y-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isOpen = openCategory === category.id;
          const base = `dashboard.help.categories.${category.id}`;

          return (
            <div
              key={category.id}
              className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
            >
              <button
                onClick={() => setOpenCategory(isOpen ? '' : category.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
              >
                <Icon className="h-5 w-5 text-gray-400" />
                <span className="flex-1 text-sm font-semibold">{t(`${base}.name` as MessageKey)}</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    isOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 px-5 py-2 dark:border-gray-700">
                      {Array.from({ length: category.faqCount }, (_, i) => ({
                        question: t(`${base}.q${i + 1}` as MessageKey),
                        answer: t(`${base}.a${i + 1}` as MessageKey),
                      })).map((faq, i) => (
                        <FAQAccordion
                          key={i}
                          faq={faq}
                          isOpen={openFAQ === `${category.id}-${i}`}
                          onToggle={() =>
                            setOpenFAQ(
                              openFAQ === `${category.id}-${i}` ? null : `${category.id}-${i}`
                            )
                          }
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

function FAQAccordion({
  faq,
  isOpen,
  onToggle,
}: {
  faq: FAQItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-100 last:border-0 dark:border-gray-700/50">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left"
      >
        <span className="pr-4 text-sm text-gray-700 dark:text-gray-300">{faq.question}</span>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-gray-400 transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <p className="pb-3 text-sm text-gray-500">{faq.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
