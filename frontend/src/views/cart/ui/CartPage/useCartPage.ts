'use client';

import { useCart } from '@/shared/lib/hooks';

import { useCartDelivery } from './hooks/useCartDelivery';
import { useCartDerivedData } from './hooks/useCartDerivedData';
import { useCartItemHandlers } from './hooks/useCartItemHandlers';
import { useCartOrders } from './hooks/useCartOrders';
import { useCartReviewActions } from './hooks/useCartReviewActions';

export function useCartPage() {
  const {
    cart,
    cartServiceItems,
    isLoading,
    refreshCart,
    updateCartItemQuantityById,
    updateComponentQuantity,
    removeCartItemById,
    removeComponentFromCart,
    removeCartServiceItemById,
    getTotalPrice,
    addServiceToCart,
  } = useCart();

  const {
    setUserOrders,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
  } = useCartOrders({
    cartLength: cart.length,
    cartServiceItems,
    addServiceToCart,
  });

  const delivery = useCartDelivery({
    orderWithDelivery,
    subtotal: getTotalPrice(),
  });

  const {
    section1ItemIds,
    section2ItemIds,
    cartItemIdsInOrder,
    cartItemIdsInApprovedOrder,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    allSectionsTotal,
    hasAnyContent,
  } = useCartDerivedData({
    cart,
    cartServiceItems,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
  });

  const itemHandlers = useCartItemHandlers({
    cart,
    updateCartItemQuantityById,
    updateComponentQuantity,
    removeCartItemById,
    removeComponentFromCart,
  });

  const reviewActions = useCartReviewActions({
    refreshCart,
    setUserOrders,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    section1ItemIds,
    section2ItemIds,
    cartServiceItemsCount: cartServiceItems.length,
    buildDeliveryPayload: delivery.buildDeliveryPayload,
  });

  const showInitialLoading = isLoading && cart.length === 0 && cartServiceItems.length === 0;

  return {
    cart,
    cartServiceItems,
    isLoading,
    ...itemHandlers,
    ...reviewActions,
    ...delivery,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
    cartItemIdsInOrder,
    cartItemIdsInApprovedOrder,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    hasAnyContent,
    allSectionsTotal,
    showInitialLoading,
    removeCartServiceItemById,
    refreshCart,
  };
}

export type CartPageModel = ReturnType<typeof useCartPage>;
