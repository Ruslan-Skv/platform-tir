import type { Metadata } from 'next';

import { ThemeInitializer } from '@/features/theme';
import { StoreProvider } from '@/shared/lib/redux';

import './globals.css';

export const metadata: Metadata = {
  title: 'Территория интерьерных решений',
  description: 'Платформа для дизайна интерьеров и покупки товаров',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
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
