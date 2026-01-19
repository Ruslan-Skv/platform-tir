import { SiteLayout } from '@/widgets/site-layout';

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return <SiteLayout>{children}</SiteLayout>;
}
