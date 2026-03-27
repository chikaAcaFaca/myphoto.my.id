import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Calendar, Clock, ArrowLeft } from 'lucide-react';
import { blogPosts, getPostBySlug, getAllSlugs } from '../posts';

interface Props {
  params: { slug: string };
}

export function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export function generateMetadata({ params }: Props): Metadata {
  const post = getPostBySlug(params.slug);
  if (!post) return { title: 'Post Not Found' };

  return {
    title: `${post.title} | MyPhoto Blog`,
    description: post.description,
    openGraph: {
      type: 'article',
      locale: 'sr_RS',
      url: `https://myphotomy.space/blog/${post.slug}`,
      siteName: 'MyPhoto',
      title: post.title,
      description: post.description,
      publishedTime: post.date,
      authors: [post.author],
      images: [{ url: 'https://myphotomy.space/og-image.png', width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://myphotomy.space/blog/${post.slug}`,
    },
  };
}

function renderMarkdown(content: string) {
  // Simple markdown-to-JSX renderer for blog content
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let tableRows: string[][] = [];
  let inTable = false;

  while (i < lines.length) {
    const line = lines[i];

    // Table detection
    if (line.startsWith('|') && line.endsWith('|')) {
      if (!inTable) {
        inTable = true;
        tableRows = [];
      }
      const cells = line
        .split('|')
        .slice(1, -1)
        .map((c) => c.trim());
      // Skip separator rows
      if (!cells.every((c) => /^[-:]+$/.test(c))) {
        tableRows.push(cells);
      }
      i++;
      continue;
    } else if (inTable) {
      inTable = false;
      elements.push(
        <div key={`table-${i}`} className="my-6 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                {tableRows[0]?.map((cell, ci) => (
                  <th
                    key={ci}
                    className="px-4 py-2 text-left font-semibold text-gray-900 dark:text-white"
                  >
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className="border-b border-gray-100 dark:border-gray-800">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2 text-gray-700 dark:text-gray-300">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
    }

    // Headings
    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="mb-4 mt-8 text-2xl font-bold text-gray-900 dark:text-white">
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="mb-3 mt-6 text-xl font-semibold text-gray-900 dark:text-white">
          {line.slice(4)}
        </h3>
      );
    }
    // List items
    else if (line.startsWith('- **')) {
      const match = line.match(/^- \*\*(.+?)\*\*\s*[—–-]\s*(.+)$/);
      if (match) {
        elements.push(
          <li key={i} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">
            <strong className="text-gray-900 dark:text-white">{match[1]}</strong> — {match[2]}
          </li>
        );
      } else {
        const boldMatch = line.match(/^- \*\*(.+?)\*\*(.*)$/);
        if (boldMatch) {
          elements.push(
            <li key={i} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">
              <strong className="text-gray-900 dark:text-white">{boldMatch[1]}</strong>{boldMatch[2]}
            </li>
          );
        }
      }
    } else if (line.startsWith('- ')) {
      elements.push(
        <li key={i} className="ml-4 mb-1 text-gray-700 dark:text-gray-300">
          {formatInline(line.slice(2))}
        </li>
      );
    }
    // Numbered list
    else if (/^\d+\.\s/.test(line)) {
      const text = line.replace(/^\d+\.\s/, '');
      elements.push(
        <li key={i} className="ml-4 mb-1 list-decimal text-gray-700 dark:text-gray-300">
          {formatInline(text)}
        </li>
      );
    }
    // Empty line
    else if (line.trim() === '') {
      // skip
    }
    // Paragraph
    else {
      elements.push(
        <p key={i} className="mb-4 text-gray-700 leading-relaxed dark:text-gray-300">
          {formatInline(line)}
        </p>
      );
    }
    i++;
  }

  return elements;
}

function formatInline(text: string): React.ReactNode {
  // Bold
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length > 1) {
    return parts.map((part, i) =>
      i % 2 === 1 ? (
        <strong key={i} className="font-semibold text-gray-900 dark:text-white">
          {part}
        </strong>
      ) : (
        part
      )
    );
  }
  return text;
}

export default function BlogPostPage({ params }: Props) {
  const post = getPostBySlug(params.slug);
  if (!post) notFound();

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: {
      '@type': 'Organization',
      name: 'MyPhoto',
      url: 'https://myphotomy.space',
    },
    url: `https://myphotomy.space/blog/${post.slug}`,
    mainEntityOfPage: `https://myphotomy.space/blog/${post.slug}`,
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Početna', item: 'https://myphotomy.space' },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: 'https://myphotomy.space/blog' },
      { '@type': 'ListItem', position: 3, name: post.title },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        {/* Back link */}
        <Link
          href="/blog"
          className="mb-8 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-primary-600 dark:text-gray-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Nazad na blog
        </Link>

        {/* Header */}
        <header className="mb-8">
          <h1 className="mb-4 text-3xl font-bold text-gray-900 sm:text-4xl dark:text-white">
            {post.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
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
            <span>{post.author}</span>
          </div>
          <div className="mt-3 flex gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-primary-100 px-2.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-900/30 dark:text-primary-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </header>

        {/* Content */}
        <div className="prose-custom">{renderMarkdown(post.content)}</div>

        {/* CTA */}
        <div className="mt-12 rounded-xl bg-primary-50 p-6 text-center dark:bg-primary-950/30">
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
            Isprobajte MyPhoto besplatno
          </h3>
          <p className="mb-4 text-gray-600 dark:text-gray-400">
            Do 15GB besplatnog prostora, bez kreditne kartice.
          </p>
          <Link
            href="/register"
            className="inline-block rounded-lg bg-primary-600 px-6 py-3 font-medium text-white hover:bg-primary-700"
          >
            Kreirajte besplatan nalog
          </Link>
        </div>
      </article>
    </>
  );
}
