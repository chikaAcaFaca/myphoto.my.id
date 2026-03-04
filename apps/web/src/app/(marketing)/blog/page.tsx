import type { Metadata } from 'next';
import Link from 'next/link';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { blogPosts } from './posts';

export const metadata: Metadata = {
  title: 'Blog — MyPhoto.my.id',
  description:
    'Saveti o privatnosti fotografija, cloud backup-u, GDPR zaštiti i poređenju servisa za čuvanje slika.',
  openGraph: {
    type: 'website',
    locale: 'sr_RS',
    url: 'https://myphoto.my.id/blog',
    siteName: 'MyPhoto.my.id',
    title: 'Blog — MyPhoto.my.id',
    description:
      'Saveti o privatnosti fotografija, cloud backup-u, GDPR zaštiti i poređenju servisa za čuvanje slika.',
    images: [{ url: 'https://myphoto.my.id/og-image.png', width: 1200, height: 630 }],
  },
  alternates: {
    canonical: 'https://myphoto.my.id/blog',
  },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'MyPhoto.my.id Blog',
  description: 'Saveti o privatnosti fotografija, cloud backup-u i GDPR zaštiti.',
  url: 'https://myphoto.my.id/blog',
  publisher: {
    '@type': 'Organization',
    name: 'MyPhoto.my.id',
    url: 'https://myphoto.my.id',
  },
};

export default function BlogPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <h1 className="mb-4 text-4xl font-bold text-gray-900 dark:text-white">
          Blog
        </h1>
        <p className="mb-12 text-lg text-gray-600 dark:text-gray-400">
          Saveti o privatnosti, backup-u i čuvanju vaših najvrednijih uspomena.
        </p>

        <div className="space-y-8">
          {blogPosts.map((post) => (
            <article
              key={post.slug}
              className="group rounded-xl border border-gray-200 p-6 transition-colors hover:border-primary-300 hover:bg-primary-50/30 dark:border-gray-800 dark:hover:border-primary-700 dark:hover:bg-primary-950/20"
            >
              <div className="mb-3 flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {new Date(post.date).toLocaleDateString('sr-RS', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {post.readingTime}
                </span>
              </div>

              <Link href={`/blog/${post.slug}`}>
                <h2 className="mb-2 text-xl font-semibold text-gray-900 group-hover:text-primary-600 dark:text-white dark:group-hover:text-primary-400">
                  {post.title}
                </h2>
              </Link>

              <p className="mb-4 text-gray-600 dark:text-gray-400">
                {post.description}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <Link
                  href={`/blog/${post.slug}`}
                  className="flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400"
                >
                  Čitaj više
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
