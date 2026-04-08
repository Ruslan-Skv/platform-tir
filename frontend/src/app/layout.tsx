import type { Metadata, Viewport } from 'next';

import { ThemeInitializer } from '@/features/theme';
import { StoreProvider } from '@/shared/lib/redux';

import './globals.css';

/** Публичный URL сайта для OG/Twitter и прочих абсолютных ссылок в metadata (см. Next metadataBase). */
function getMetadataBase(): URL {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw) {
    try {
      return new URL(raw.endsWith('/') ? raw.slice(0, -1) : raw);
    } catch {
      /* ignore invalid */
    }
  }
  if (process.env.VERCEL_URL) {
    return new URL(`https://${process.env.VERCEL_URL}`);
  }
  return new URL('http://localhost:3000');
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: 'Территория интерьерных решений',
  description: 'Платформа для дизайна интерьеров и покупки товаров',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'ТИР',
    statusBarStyle: 'default',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0f172a' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        {/* Тема на html до React — убирает мигание светлой темы при навигации в тёмном режиме */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');document.documentElement.setAttribute('data-theme',t==='dark'?'dark':'light');})();`,
          }}
        />
        <StoreProvider>
          <ThemeInitializer>{children}</ThemeInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
