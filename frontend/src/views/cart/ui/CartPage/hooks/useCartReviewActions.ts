'use client';

import { type Dispatch, type SetStateAction, useEffect, useState } from 'react';

import { sendOrderToCustomerEmail, updateAdminOrderCustomer } from '@/shared/api/admin-orders';
import {
  type SubmitFromCartFullPayload,
  type UserOrder,
  addCartItemToOrder,
  canResendOrderToEmail,
  cancelOrderByCustomer,
  getUserOrders,
  submitOrderFromCart,
} from '@/shared/api/user-orders';

type DeliveryPayload = {
  deliveryAddress: { street: string; city: string };
  deliveryType: 'TO_ENTRANCE' | 'TO_APARTMENT';
  deliveryFloor?: number;
  deliveryHasElevator?: boolean;
  distanceKm?: number;
  preferredDeliveryTime?: string;
} | null;

type UseCartReviewActionsParams = {
  refreshCart: (options?: { silent?: boolean }) => Promise<void>;
  setUserOrders: Dispatch<SetStateAction<UserOrder[] | null>>;
  pendingReviewOrder: UserOrder | null;
  approvedOrder: UserOrder | null;
  returnedForCorrectionOrder: UserOrder | null;
  approvalRemainingMs: number;
  section1ItemIds: Set<string>;
  section2ItemIds: Set<string>;
  cartServiceItemsCount: number;
  buildDeliveryPayload: () => DeliveryPayload;
};

export function useCartReviewActions({
  refreshCart,
  setUserOrders,
  pendingReviewOrder,
  approvedOrder,
  returnedForCorrectionOrder,
  approvalRemainingMs,
  section1ItemIds,
  section2ItemIds,
  cartServiceItemsCount,
  buildDeliveryPayload,
}: UseCartReviewActionsParams) {
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [addToOrderInProgress, setAddToOrderInProgress] = useState<Set<string>>(new Set());
  const [showAddToApprovedModal, setShowAddToApprovedModal] = useState(false);
  const [showAddToPendingReviewModal, setShowAddToPendingReviewModal] = useState(false);
  const [showSendToEmailModal, setShowSendToEmailModal] = useState(false);
  const [canSendToEmail, setCanSendToEmail] = useState(false);
  const [sendToEmailCustomer, setSendToEmailCustomer] = useState({
    customerEmail: '',
    customerFirstName: '',
    customerMiddleName: '',
    customerLastName: '',
    customerPhone: '',
  });
  const [sendToEmailInProgress, setSendToEmailInProgress] = useState(false);
  const [sendToEmailMessage, setSendToEmailMessage] = useState<string | null>(null);
  const [dismissedManagerCommentIds, setDismissedManagerCommentIds] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    canResendOrderToEmail()
      .then(setCanSendToEmail)
      .catch(() => setCanSendToEmail(false));
  }, []);

  const hasNewServiceItems = cartServiceItemsCount > 0;
  const hasNewItemsForReview = section1ItemIds.size > 0 || hasNewServiceItems;
  const needsAddToApprovedConfirm =
    !!approvedOrder &&
    approvalRemainingMs > 0 &&
    hasNewItemsForReview &&
    !returnedForCorrectionOrder;
  const needsAddToPendingReviewConfirm =
    !!pendingReviewOrder &&
    hasNewItemsForReview &&
    !returnedForCorrectionOrder &&
    !needsAddToApprovedConfirm;

  const doSubmitForReview = async (options?: {
    addToApproved?: boolean;
    addToPendingReview?: boolean;
  }) => {
    setSubmitInProgress(true);
    try {
      const payload = buildDeliveryPayload();
      const cartItemIdsToSubmit =
        returnedForCorrectionOrder != null
          ? [...Array.from(section1ItemIds), ...Array.from(section2ItemIds)]
          : Array.from(section1ItemIds);
      const basePayload =
        payload != null
          ? { ...payload, cartItemIds: cartItemIdsToSubmit }
          : { cartItemIds: cartItemIdsToSubmit };
      let fullPayload: SubmitFromCartFullPayload = basePayload;
      if (options?.addToApproved === true) fullPayload = { ...fullPayload, addToApproved: true };
      if (options?.addToPendingReview === true)
        fullPayload = { ...fullPayload, addToPendingReview: true };
      const returnedOrder = await submitOrderFromCart(fullPayload);
      setShowAddToApprovedModal(false);
      setShowAddToPendingReviewModal(false);
      await refreshCart();
      setUserOrders((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((o) => o.id === returnedOrder.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...next[idx], ...returnedOrder };
          return next;
        }
        return [returnedOrder, ...list];
      });
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отправить заказ на проверку');
    } finally {
      setSubmitInProgress(false);
    }
  };

  const handleSubmitForReview = () => {
    if (needsAddToApprovedConfirm) {
      setShowAddToApprovedModal(true);
      return;
    }
    if (needsAddToPendingReviewConfirm) {
      setShowAddToPendingReviewModal(true);
      return;
    }
    doSubmitForReview();
  };

  const handleAddToOrder = async (cartItemId: string) => {
    if (!pendingReviewOrder) return;
    setAddToOrderInProgress((prev) => new Set(prev).add(cartItemId));
    try {
      await addCartItemToOrder(pendingReviewOrder.id, cartItemId);
      await refreshCart();
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось добавить товар в заказ');
    } finally {
      setAddToOrderInProgress((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const orderToCancel = pendingReviewOrder ?? returnedForCorrectionOrder;
  const handleCancelReview = async () => {
    if (!orderToCancel) return;
    setCancelInProgress(true);
    try {
      await cancelOrderByCustomer(orderToCancel.id);
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отменить заказ');
    } finally {
      setCancelInProgress(false);
    }
  };

  const openSendToEmailModal = () => {
    if (!approvedOrder) return;
    const email =
      approvedOrder.createdByManagerId && approvedOrder.customerEmail
        ? approvedOrder.customerEmail
        : (approvedOrder.user?.email ?? approvedOrder.customerEmail ?? '');
    setSendToEmailCustomer({
      customerEmail: email,
      customerFirstName: approvedOrder.customerFirstName ?? approvedOrder.user?.firstName ?? '',
      customerMiddleName: approvedOrder.customerMiddleName ?? '',
      customerLastName: approvedOrder.customerLastName ?? approvedOrder.user?.lastName ?? '',
      customerPhone: approvedOrder.customerPhone ?? '',
    });
    setSendToEmailMessage(null);
    setShowSendToEmailModal(true);
  };

  const handleSendToEmailSubmit = async () => {
    if (!approvedOrder) return;
    const email = sendToEmailCustomer.customerEmail.trim();
    if (!email) {
      setSendToEmailMessage('Введите email покупателя');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setSendToEmailMessage('Некорректный email');
      return;
    }
    setSendToEmailInProgress(true);
    setSendToEmailMessage(null);
    try {
      await updateAdminOrderCustomer(approvedOrder.id, {
        customerEmail: email,
        customerFirstName: sendToEmailCustomer.customerFirstName.trim() || null,
        customerMiddleName: sendToEmailCustomer.customerMiddleName.trim() || null,
        customerLastName: sendToEmailCustomer.customerLastName.trim() || null,
        customerPhone: sendToEmailCustomer.customerPhone.trim() || null,
      });
      const result = await sendOrderToCustomerEmail(approvedOrder.id);
      if (result.sent) {
        setShowSendToEmailModal(false);
        const orders = await getUserOrders();
        setUserOrders(orders);
      } else {
        setSendToEmailMessage(result.error ?? 'Не удалось отправить');
      }
    } catch (err) {
      setSendToEmailMessage(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setSendToEmailInProgress(false);
    }
  };

  return {
    submitInProgress,
    cancelInProgress,
    addToOrderInProgress,
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
    handleAddToOrder,
    handleSubmitForReview,
    handleCancelReview,
    openSendToEmailModal,
    handleSendToEmailSubmit,
    doSubmitForReview,
  };
}
