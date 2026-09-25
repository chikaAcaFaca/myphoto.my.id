'use client';

import { motion } from 'framer-motion';
import { Users, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { useT } from '@/i18n/client';

export default function PeoplePage() {
  const t = useT();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-full"
    >
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.people.title')}</h1>
        <p className="text-sm text-gray-500">
          {t('dashboard.people.subtitle')}
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <div className="relative mb-6">
          <div className="rounded-full bg-purple-50 p-6 dark:bg-purple-900/20">
            <Users className="h-12 w-12 text-purple-500" />
          </div>
          <div className="absolute -right-1 -top-1 rounded-full bg-yellow-100 p-1.5 dark:bg-yellow-900/30">
            <Sparkles className="h-4 w-4 text-yellow-500" />
          </div>
        </div>
        <h2 className="text-xl font-semibold">{t('dashboard.people.aiTitle')}</h2>
        <p className="mt-2 max-w-md text-gray-500">
          {t('dashboard.people.aiText')}
        </p>
        <Link href="/pricing" className="btn-primary mt-6">
          <Sparkles className="mr-2 h-4 w-4" />
          {t('dashboard.people.upgrade')}
        </Link>
      </motion.div>
    </motion.div>
  );
}
