import type { Metadata } from 'next';
import { StoreProvider } from '@/shared/lib/redux';
import { ThemeInitializer } from '@/features/theme';
import { SiteLayout } from '@/widgets/site-layout';
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
          <ThemeInitializer>
            <SiteLayout>{children}</SiteLayout>
          </ThemeInitializer>
        </StoreProvider>
      </body>
    </html>
  );
}
