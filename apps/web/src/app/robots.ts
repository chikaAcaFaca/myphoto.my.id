import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/photos', '/albums', '/favorites', '/trash', '/duplicates', '/memories'],
    },
    sitemap: 'https://mycamerabackup.com/sitemap.xml',
  };
}
