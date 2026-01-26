import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { CompareProvider } from '@/shared/lib/contexts/CompareContext';
import { WishlistProvider } from '@/shared/lib/contexts/WishlistContext';
import { SiteLayout } from '@/widgets/site-layout';

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <CompareProvider>
          <SiteLayout>{children}</SiteLayout>
        </CompareProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
