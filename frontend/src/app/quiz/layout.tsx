import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  icons: {
    icon: [{ url: '/favicon.ico', sizes: '48x48' }],
    shortcut: [{ url: '/favicon.ico' }],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
