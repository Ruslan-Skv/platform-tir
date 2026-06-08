import type { Metadata, Viewport } from 'next';

import { ThemeInitializer } from '@/features/theme';
import { buildSiteBootstrapScript } from '@/shared/lib/mobile-catalog-columns-bootstrap-script';
import { StoreProvider } from '@/shared/lib/redux';
import { getCatalogSettingsCached } from '@/views/catalog/lib/fetch-catalog-settings-cached';

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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let serverDefaultMobileCatalogColumns: 1 | 2 = 1;
  try {
    const catalogSettings = await getCatalogSettingsCached();
    serverDefaultMobileCatalogColumns = catalogSettings.defaultMobileCatalogColumns === 2 ? 2 : 1;
  } catch {
    /* fallback: 1 колонка */
  }

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {/* До гидратации: тема и колонки каталога (только скрипт, без SSR-атрибута на html) */}
        <script
          dangerouslySetInnerHTML={{
            __html: buildSiteBootstrapScript(serverDefaultMobileCatalogColumns),
          }}
        />
      </head>
      <body>
        <StoreProvider>
          <ThemeInitializer>{children}</ThemeInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
