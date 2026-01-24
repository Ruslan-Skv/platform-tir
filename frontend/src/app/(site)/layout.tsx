import { CartProvider } from '@/shared/lib/contexts/CartContext';
import { WishlistProvider } from '@/shared/lib/contexts/WishlistContext';
import { SiteLayout } from '@/widgets/site-layout';

export default function SiteRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <WishlistProvider>
        <SiteLayout>{children}</SiteLayout>
      </WishlistProvider>
    </CartProvider>
  );
}
