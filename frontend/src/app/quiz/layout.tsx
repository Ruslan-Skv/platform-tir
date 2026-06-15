import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
  manifest: '/manifest.webmanifest',
};

export default function QuizLayout({ children }: { children: React.ReactNode }) {
  return children;
}
