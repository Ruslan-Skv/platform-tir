'use client';

import { CartPageView } from './CartPageView';
import { useCartPage } from './useCartPage';

export function CartPage() {
  const model = useCartPage();
  return <CartPageView model={model} />;
}
