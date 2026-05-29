import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://literaconnect.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/explore', '/post/', '/profile/'],
        disallow: ['/api/', '/editor', '/chat', '/activity'],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  };
}
