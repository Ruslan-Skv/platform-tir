import { fetchNavigation } from '@/shared/api/navigation';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { NavigationProvider } from '@/shared/lib/contexts/NavigationContext';
import { WishlistProvider } from '@/shared/lib/contexts/WishlistContext';
import { getServerApiBaseUrl } from '@/shared/lib/server-api-base-url';
import { CartAuthRequiredModalHost } from '@/shared/ui/CartAuthRequiredModal';
import { CompareLimitToastHost } from '@/shared/ui/CompareLimitToast';
import { SiteLayout } from '@/widgets/site-layout';

export default async function SiteRootLayout({ children }: { children: React.ReactNode }) {
  const initialNavigation = await fetchNavigation(getServerApiBaseUrl());

  return (
    <NavigationProvider initialItems={initialNavigation}>
      <CartProvider>
        <CartAuthRequiredModalHost />
        <CompareLimitToastHost />
        <WishlistProvider>
          <SiteLayout>{children}</SiteLayout>
        </WishlistProvider>
      </CartProvider>
    </NavigationProvider>
  );
}
