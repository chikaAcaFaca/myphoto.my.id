'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Cloud, ArrowLeft, Mail, MessageSquare, Send, MapPin, Clock } from 'lucide-react';
import { useT } from '@/i18n/client';

export default function ContactPage() {
  const t = useT();
  const [form, setForm] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailtoSubject = encodeURIComponent(form.subject || t('pages.contact.mailSubject'));
    const mailtoBody = encodeURIComponent(
      `${t('pages.contact.mailName')}: ${form.name}\nEmail: ${form.email}\n\n${form.message}`
    );
    window.location.href = `mailto:support@myphotomy.space?subject=${mailtoSubject}&body=${mailtoBody}`;
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

      {/* Content */}
      <main className="container mx-auto max-w-5xl px-4 py-12">
        <div className="mb-12 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
            <MessageSquare className="h-8 w-8 text-primary-600 dark:text-primary-400" />
          </div>
          <h1 className="mb-2 text-4xl font-bold">{t('pages.contact.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300">
            {t('pages.contact.subtitle')}
          </p>
        </div>

        <div className="grid gap-12 md:grid-cols-2">
          {/* Contact Form */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">{t('pages.contact.formTitle')}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('pages.contact.nameLabel')}
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder={t('pages.contact.namePlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('pages.contact.emailLabel')}
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder={t('pages.contact.emailPlaceholder')}
                />
              </div>

              <div>
                <label htmlFor="subject" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('pages.contact.subjectLabel')}
                </label>
                <select
                  id="subject"
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                >
                  <option value="">{t('pages.contact.subjectPlaceholder')}</option>
                  <option value={t('pages.contact.subjects.general')}>{t('pages.contact.subjects.general')}</option>
                  <option value={t('pages.contact.subjects.technical')}>{t('pages.contact.subjects.technical')}</option>
                  <option value={t('pages.contact.subjects.billing')}>{t('pages.contact.subjects.billing')}</option>
                  <option value={t('pages.contact.subjects.bug')}>{t('pages.contact.subjects.bug')}</option>
                  <option value={t('pages.contact.subjects.suggestion')}>{t('pages.contact.subjects.suggestion')}</option>
                  <option value={t('pages.contact.subjects.partnership')}>{t('pages.contact.subjects.partnership')}</option>
                </select>
              </div>

              <div>
                <label htmlFor="message" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('pages.contact.messageLabel')}
                </label>
                <textarea
                  id="message"
                  required
                  rows={5}
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  className="w-full rounded-lg border border-gray-300 px-4 py-3 text-gray-900 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  placeholder={t('pages.contact.messagePlaceholder')}
                />
              </div>

              <button
                type="submit"
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-600"
              >
                <Send className="h-4 w-4" />
                {t('pages.contact.send')}
              </button>
            </form>
          </div>

          {/* Contact Info */}
          <div>
            <h2 className="mb-6 text-2xl font-bold">{t('pages.contact.infoTitle')}</h2>
            <div className="space-y-6">
              <div className="flex gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/30">
                  <Mail className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('pages.contact.emailTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">support@myphotomy.space</p>
                  <p className="mt-1 text-sm text-gray-500">{t('pages.contact.emailHint')}</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <Clock className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('pages.contact.hoursTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('pages.contact.hours')}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('pages.contact.hoursHint')}</p>
                </div>
              </div>

              <div className="flex gap-4 rounded-xl bg-white p-5 shadow-sm dark:bg-gray-800">
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                  <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">{t('pages.contact.locationTitle')}</h3>
                  <p className="text-gray-600 dark:text-gray-300">{t('pages.contact.location')}</p>
                  <p className="mt-1 text-sm text-gray-500">{t('pages.contact.locationHint')}</p>
                </div>
              </div>
            </div>

            {/* FAQ Link */}
            <div className="mt-8 rounded-xl border-2 border-primary-200 bg-primary-50 p-5 dark:border-primary-800 dark:bg-primary-900/20">
              <h3 className="font-semibold text-primary-800 dark:text-primary-400">
                {t('pages.contact.faqTitle')}
              </h3>
              <p className="mt-1 text-sm text-primary-700 dark:text-primary-300">
                {t('pages.contact.faqText')}
              </p>
              <Link
                href="/support"
                className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:underline dark:text-primary-400"
              >
                {t('pages.contact.faqLink')} &rarr;
              </Link>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-2xl bg-gradient-to-r from-primary-500 to-primary-600 p-8 text-center text-white">
          <h2 className="text-2xl font-bold">{t('pages.contact.ctaTitle')}</h2>
          <p className="mx-auto mt-2 max-w-xl text-primary-100">
            {t('pages.contact.ctaText')}
          </p>
          <Link
            href="/register"
            className="mt-6 inline-block rounded-lg bg-white px-8 py-3 font-semibold text-primary-600 transition-colors hover:bg-primary-50"
          >
            {t('pages.contact.ctaButton')}
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
            <Link href="/refund" className="hover:text-primary-500">{t('pages.shell.refund')}</Link>
            <Link href="/contact" className="hover:text-primary-500">{t('pages.shell.contact')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
