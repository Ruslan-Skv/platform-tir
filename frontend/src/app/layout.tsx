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
    <html lang="ru">
      <body>
        <StoreProvider>
          <ThemeInitializer>{children}</ThemeInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
