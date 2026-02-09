import { fetchNavigation } from '@/shared/api/navigation';
import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { CompareProvider } from '@/shared/lib/contexts/CompareContext';
import { NavigationProvider } from '@/shared/lib/contexts/NavigationContext';
import { WishlistProvider } from '@/shared/lib/contexts/WishlistContext';
import { SiteLayout } from '@/widgets/site-layout';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export default async function SiteRootLayout({ children }: { children: React.ReactNode }) {
  const initialNavigation = await fetchNavigation(API_URL);

  return (
    <NavigationProvider initialItems={initialNavigation}>
      <CartProvider>
        <WishlistProvider>
          <CompareProvider>
            <SiteLayout>{children}</SiteLayout>
          </CompareProvider>
        </WishlistProvider>
      </CartProvider>
    </NavigationProvider>
  );
}
