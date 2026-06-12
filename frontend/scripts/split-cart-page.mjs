#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cartPageDir = path.join(__dirname, '../src/views/cart/ui/CartPage');
const srcPath = path.join(cartPageDir, 'CartPage.tsx');
const lines = fs.readFileSync(srcPath, 'utf8').split(/\r?\n/);

const bodyStart = lines.findIndex((l, i) => i > 0 && l.trim().startsWith('const {') && lines[i - 1]?.includes('export function CartPage'));
const viewStart = lines.findIndex((l) => l.includes('const showInitialLoading'));
const modalsEnd = lines.findIndex((l) => l.includes('onSendToEmailCustomerChange={setSendToEmailCustomer}'));
const funcEnd = lines.findIndex((l, i) => i > modalsEnd && l.trim() === ');');

const hookBody = lines.slice(bodyStart, viewStart).join('\n');
const viewBody = lines.slice(viewStart, funcEnd + 1).join('\n');

const useCartPage = `'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { sendOrderToCustomerEmail, updateAdminOrderCustomer } from '@/shared/api/admin-orders';
import type { CartItem } from '@/shared/api/cart';
import {
  type CalculateDeliveryResult,
  type DeliverySettlementOption,
  type DeliveryType,
  type SubmitFromCartFullPayload,
  type UserOrder,
  addCartItemToOrder,
  calculateDelivery,
  canResendOrderToEmail,
  cancelOrderByCustomer,
  getApprovalRemainingMs,
  getDeliverySettlements,
  getUserOrders,
  submitOrderFromCart,
} from '@/shared/api/user-orders';
import { apiFetch } from '@/shared/lib/api-fetch';
import { useApprovedOrderGuard } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { useCart } from '@/shared/lib/hooks';
import {
  getRestoredServiceOrderIds,
  markServiceOrderRestored,
} from '@/views/cart/lib/cart-service-order-restore';
import {
  buildCartItemIdsInApprovedOrder,
  buildCartItemIdsInReviewOrder,
  buildManagerCommentByCartItemId,
  buildSection1ItemIds,
} from '@/views/cart/lib/cart-order-matching';
import { buildCartSections } from '@/views/cart/lib/build-cart-sections';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function useCartPage() {
${hookBody}
  const showInitialLoading = isLoading && cart.length === 0 && cartServiceItems.length === 0;

  return {
    cart,
    cartServiceItems,
    isLoading,
    updatingItems,
    submitInProgress,
    cancelInProgress,
    addToOrderInProgress,
    wantDelivery,
    setWantDelivery,
    deliveryForm,
    setDeliveryForm,
    calculatedDelivery,
    deliveryCalculationLoading,
    deliveryCalculationError,
    deliverySettlements,
    deliveryPaymentMode,
    dismissedManagerCommentIds,
    setDismissedManagerCommentIds,
    showAddToApprovedModal,
    setShowAddToApprovedModal,
    showAddToPendingReviewModal,
    setShowAddToPendingReviewModal,
    showSendToEmailModal,
    setShowSendToEmailModal,
    canSendToEmail,
    sendToEmailCustomer,
    setSendToEmailCustomer,
    sendToEmailInProgress,
    sendToEmailMessage,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
    cartItemIdsInOrder,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    hasAnyContent,
    allSectionsTotal,
    deliveryFormValid,
    deliveryFormValidForCalculation,
    showInitialLoading,
    handleAddToOrder,
    handleSubmitForReview,
    handleDeliveryCheckboxChange,
    handleCancelReview,
    handleQuantityChange,
    handleComponentQuantityChange,
    handleRemoveItem,
    handleRemoveComponent,
    openSendToEmailModal,
    handleSendToEmailSubmit,
    doSubmitForReview,
    removeCartServiceItemById,
    refreshCart,
  };
}

export type CartPageModel = ReturnType<typeof useCartPage>;
`;

const cartPageView = `'use client';

import { TrashIcon, TruckIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import * as cartApi from '@/shared/api/cart';
import { formatApprovalCountdown } from '@/shared/api/user-orders';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import { pluralizeRu } from '@/views/cart/lib/pluralize-ru';
import { buildPresetQuery, buildRoomsParam } from '@/views/cart/lib/cart-url-utils';

import { CartPageModals } from './CartPageModals';
import type { CartPageModel } from './useCartPage';
import styles from './CartPage.module.css';

type CartPageViewProps = {
  model: CartPageModel;
};

export function CartPageView({ model }: CartPageViewProps) {
  const {
    cart,
    cartServiceItems,
    isLoading,
    updatingItems,
    submitInProgress,
    cancelInProgress,
    addToOrderInProgress,
    wantDelivery,
    setWantDelivery,
    deliveryForm,
    setDeliveryForm,
    calculatedDelivery,
    deliveryCalculationLoading,
    deliveryCalculationError,
    deliverySettlements,
    deliveryPaymentMode,
    dismissedManagerCommentIds,
    setDismissedManagerCommentIds,
    showAddToApprovedModal,
    setShowAddToApprovedModal,
    showAddToPendingReviewModal,
    setShowAddToPendingReviewModal,
    showSendToEmailModal,
    setShowSendToEmailModal,
    canSendToEmail,
    sendToEmailCustomer,
    setSendToEmailCustomer,
    sendToEmailInProgress,
    sendToEmailMessage,
    pendingReviewOrder,
    approvedOrder,
    returnedForCorrectionOrder,
    approvalRemainingMs,
    pendingOrderHasDelivery,
    approvedOrderHasDelivery,
    returnedOrderHasDelivery,
    orderWithDelivery,
    cartItemIdsInOrder,
    cartSections,
    managerCommentByCartItemId,
    canSubmitForReview,
    hasAnyContent,
    allSectionsTotal,
    deliveryFormValid,
    deliveryFormValidForCalculation,
    showInitialLoading,
    handleAddToOrder,
    handleSubmitForReview,
    handleDeliveryCheckboxChange,
    handleCancelReview,
    handleQuantityChange,
    handleComponentQuantityChange,
    handleRemoveItem,
    handleRemoveComponent,
    openSendToEmailModal,
    handleSendToEmailSubmit,
    doSubmitForReview,
    removeCartServiceItemById,
    refreshCart,
  } = model;

${viewBody.replace('const showInitialLoading = isLoading && cart.length === 0 && cartServiceItems.length === 0;\n\n', '')}
}
`;

const cartPageShell = `'use client';

import { CartPageView } from './CartPageView';
import { useCartPage } from './useCartPage';

export function CartPage() {
  const model = useCartPage();
  return <CartPageView model={model} />;
};
`;

fs.writeFileSync(path.join(cartPageDir, 'useCartPage.ts'), useCartPage);
fs.writeFileSync(path.join(cartPageDir, 'CartPageView.tsx'), cartPageView);
fs.writeFileSync(path.join(cartPageDir, 'CartPage.tsx'), cartPageShell);
console.log('Split complete:', { hookLines: hookBody.split('\n').length, viewLines: viewBody.split('\n').length });
