'use client';

import { useMemo } from 'react';

import type { CartItem, CartServiceItem } from '@/shared/api/cart';
import type { UserOrder } from '@/shared/api/user-orders';
import { buildCartSections } from '@/views/cart/lib/build-cart-sections';
import {
  buildCartItemIdsInApprovedOrder,
  buildCartItemIdsInReviewOrder,
  buildManagerCommentByCartItemId,
  buildSection1ItemIds,
} from '@/views/cart/lib/cart-order-matching';

type UseCartDerivedDataParams = {
  cart: CartItem[];
  cartServiceItems: CartServiceItem[];
  pendingReviewOrder: UserOrder | null;
  approvedOrder: UserOrder | null;
  returnedForCorrectionOrder: UserOrder | null;
};

export function useCartDerivedData({
  cart,
  cartServiceItems,
  pendingReviewOrder,
  approvedOrder,
  returnedForCorrectionOrder,
}: UseCartDerivedDataParams) {
  const cartItemIdsInReviewOrder = useMemo(
    () => buildCartItemIdsInReviewOrder(cart, pendingReviewOrder, returnedForCorrectionOrder),
    [cart, pendingReviewOrder, returnedForCorrectionOrder]
  );

  const cartItemIdsInOrder = cartItemIdsInReviewOrder;

  const cartItemIdsInApprovedOrder = useMemo(
    () => buildCartItemIdsInApprovedOrder(cart, approvedOrder),
    [cart, approvedOrder]
  );

  const section1ItemIds = useMemo(
    () => buildSection1ItemIds(cart, cartItemIdsInReviewOrder, cartItemIdsInApprovedOrder),
    [cart, cartItemIdsInReviewOrder, cartItemIdsInApprovedOrder]
  );

  const section2ItemIds = cartItemIdsInReviewOrder;
  const section3ItemIds = cartItemIdsInApprovedOrder;

  const cartSections = useMemo(
    () =>
      buildCartSections({
        cart,
        cartServiceItems,
        section1ItemIds,
        section2ItemIds,
        section3ItemIds,
        pendingReviewOrder,
        returnedForCorrectionOrder,
        approvedOrder,
      }),
    [
      cart,
      cartServiceItems,
      section1ItemIds,
      section2ItemIds,
      section3ItemIds,
      pendingReviewOrder,
      returnedForCorrectionOrder,
      approvedOrder,
    ]
  );

  const managerCommentByCartItemId = useMemo(
    () =>
      buildManagerCommentByCartItemId(
        cart,
        approvedOrder,
        pendingReviewOrder,
        returnedForCorrectionOrder
      ),
    [cart, approvedOrder, pendingReviewOrder, returnedForCorrectionOrder]
  );

  const hasServiceItems = cartServiceItems.length > 0;
  const canSubmitForReview = returnedForCorrectionOrder
    ? section2ItemIds.size > 0 || hasServiceItems
    : section1ItemIds.size > 0 || hasServiceItems;

  const allSectionsTotal = useMemo(() => {
    const total = cartSections.reduce((s, sec) => s + sec.total, 0);
    const items = cartSections.reduce((s, sec) => s + sec.itemCount, 0);
    return { total, items };
  }, [cartSections]);

  const hasAnyContent =
    cart.length > 0 || cartServiceItems.length > 0 || allSectionsTotal.items > 0;

  return {
    cartItemIdsInOrder,
    cartItemIdsInApprovedOrder,
    section1ItemIds,
    section2ItemIds,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    allSectionsTotal,
    hasAnyContent,
  };
}
