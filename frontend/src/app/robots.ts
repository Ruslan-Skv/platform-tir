import type { MetadataRoute } from 'next';

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL || 'https://territory-interior.ru';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/'],
      },
    ],
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
