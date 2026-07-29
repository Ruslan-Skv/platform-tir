'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAdminSectionCanEdit } from '@/features/admin/contexts/AdminSectionPermissionContext';
import { useAuth } from '@/features/auth';
import {
  type AdminOrderSummary,
  deleteAdminOrder,
  getAdminOrder,
  sendBackOrderToCustomer,
  sendOrderToCustomerEmail,
  updateAdminOrderCustomer,
  updateAdminOrderDelivery,
  updateAdminOrderItem,
  updateAdminOrderStatus,
} from '@/shared/api/admin-orders';
import { ensureFreshAccessToken } from '@/shared/lib/auth-session';
import { useAdminStickySaveButton } from '@/views/admin/ui/AdminStickySaveButton';

import { ORDER_DETAIL_POLL_INTERVAL_MS } from '../order-detail-page.constants';
import type { OrderDetail, OrderItemDetail, OrderServiceGroup } from '../order-detail-page.types';
import { groupOrderServiceItems } from '../order-detail-page.utils';

export function useOrderDetailPage(orderId: string) {
  const router = useRouter();
  const { user } = useAuth();
  const { canEdit } = useAdminSectionCanEdit();
  const pageHeaderRef = useRef<HTMLDivElement>(null);
  const handleSaveAllRef = useRef<() => Promise<void>>(async () => {});

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendBackModalOpen, setSendBackModalOpen] = useState(false);
  const [sendBackComment, setSendBackComment] = useState('');
  const [sendBackSubmitting, setSendBackSubmitting] = useState(false);
  const [approvedNotice, setApprovedNotice] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [cancelOrderConfirmOpen, setCancelOrderConfirmOpen] = useState(false);
  const [sendToEmailInProgress, setSendToEmailInProgress] = useState(false);
  const [deliveryShippingCost, setDeliveryShippingCost] = useState('');
  const [deliveryCarryCost, setDeliveryCarryCost] = useState('');
  const [deliveryMoversCount, setDeliveryMoversCount] = useState('');
  const [deliveryPlannedDate, setDeliveryPlannedDate] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerMiddleName, setCustomerMiddleName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveToastSuccess, setSaveToastSuccess] = useState<string | null>(null);
  const [saveToastError, setSaveToastError] = useState<string | null>(null);
  const [, setTick] = useState(0);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [commentDraftByItemId, setCommentDraftByItemId] = useState<Record<string, string>>({});

  const normalizeOrder = useCallback((data: AdminOrderSummary & { items?: unknown[] }) => {
    return {
      ...(data as OrderDetail),
      items: Array.isArray(data.items) ? (data.items as OrderItemDetail[]) : [],
    } satisfies OrderDetail;
  }, []);

  const loadOrder = useCallback(() => {
    if (!orderId) return;
    getAdminOrder(orderId).then((data) => setOrder(normalizeOrder(data)));
  }, [orderId, normalizeOrder]);

  const handleRefresh = useCallback(() => {
    if (!orderId) return;
    setRefreshing(true);
    getAdminOrder(orderId)
      .then((data) => setOrder(normalizeOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setRefreshing(false));
  }, [orderId, normalizeOrder]);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    setLoading(true);
    getAdminOrder(orderId)
      .then((data) => {
        if (cancelled) return;
        setOrder(normalizeOrder(data));
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId, normalizeOrder]);

  useEffect(() => {
    if (!order) return;
    const items = order.items ?? [];
    if (items.length === 0) return;
    setCommentDraftByItemId((prev) => {
      const next = { ...prev };
      for (const item of items) {
        next[item.id] = item.managerComment ?? '';
      }
      return next;
    });
  }, [order]);

  useEffect(() => {
    if (!order) return;
    const managerCreated = Boolean(order.createdByManagerId);
    const managerIsCustomer = managerCreated && order.user?.id === order.createdByManagerId;
    setDeliveryShippingCost(order.shippingCost != null ? String(order.shippingCost) : '');
    setDeliveryCarryCost(
      order.carryCost != null && order.carryCost !== '' ? String(order.carryCost) : ''
    );
    setDeliveryMoversCount(order.moversCount != null ? String(order.moversCount) : '');
    setDeliveryPlannedDate(
      order.plannedDeliveryDate
        ? new Date(order.plannedDeliveryDate).toISOString().slice(0, 10)
        : ''
    );
    setCustomerEmail(
      managerIsCustomer
        ? ''
        : managerCreated
          ? (order.customerEmail ?? '')
          : (order.customerEmail ?? order.user?.email ?? '')
    );
    setCustomerPhone(managerIsCustomer ? '' : (order.customerPhone ?? order.user?.phone ?? ''));
    setCustomerFirstName(
      managerIsCustomer
        ? ''
        : managerCreated
          ? (order.customerFirstName ?? '')
          : (order.customerFirstName ?? order.user?.firstName ?? '')
    );
    setCustomerMiddleName(managerIsCustomer ? '' : (order.customerMiddleName ?? ''));
    setCustomerLastName(
      managerIsCustomer
        ? ''
        : managerCreated
          ? (order.customerLastName ?? '')
          : (order.customerLastName ?? order.user?.lastName ?? '')
    );
  }, [order]);

  useEffect(() => {
    const timerId = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(timerId);
  }, []);

  useEffect(() => {
    if (!orderId || !order || loading) return;
    const intervalId = setInterval(() => {
      ensureFreshAccessToken()
        .then(() => getAdminOrder(orderId))
        .then((data) => setOrder(normalizeOrder(data)))
        .catch(() => {});
    }, ORDER_DETAIL_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [orderId, order, loading, normalizeOrder]);

  useEffect(() => {
    if (!orderId || !order) return;
    const onFocus = () => {
      ensureFreshAccessToken()
        .then(() => getAdminOrder(orderId))
        .then((data) => setOrder(normalizeOrder(data)))
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [orderId, order, normalizeOrder]);

  const handleStatusChange = async (newStatus: string) => {
    if (!canEdit) return;
    if (!orderId || !order) return;
    setApprovedNotice(false);
    setStatusUpdating(true);
    try {
      const updated = await updateAdminOrderStatus(orderId, newStatus);
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              status: updated.status,
              approvedAt: updated.approvedAt ?? prev.approvedAt,
            }
          : null
      );
      if (newStatus === 'APPROVED') {
        setApprovedNotice(true);
        setTimeout(() => setApprovedNotice(false), 8000);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить статус');
    } finally {
      setStatusUpdating(false);
    }
  };

  const handleSendBack = async () => {
    if (!canEdit) return;
    if (!orderId || !order) return;
    const items = order.items ?? [];
    if (items.length === 0) return;
    setSendBackSubmitting(true);
    try {
      const toSave = items.filter((item) => {
        const draft = (commentDraftByItemId[item.id] ?? item.managerComment ?? '').trim();
        const saved = (item.managerComment ?? '').trim();
        return draft !== saved;
      });
      await Promise.all(
        toSave.map((item) =>
          updateAdminOrderItem(orderId, item.id, {
            managerComment:
              (commentDraftByItemId[item.id] ?? item.managerComment ?? '').trim() || null,
          })
        )
      );
      const updated = await sendBackOrderToCustomer(orderId, sendBackComment || undefined);
      setOrder(normalizeOrder(updated));
      setSendBackModalOpen(false);
      setSendBackComment('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отправить на доработку');
    } finally {
      setSendBackSubmitting(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!orderId || user?.role !== 'SUPER_ADMIN') return;
    setDeleteSubmitting(true);
    try {
      await deleteAdminOrder(orderId);
      setDeleteConfirmOpen(false);
      router.push('/admin/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось переместить заказ в корзину');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSendToEmail = async () => {
    if (!orderId) return;
    setSendToEmailInProgress(true);
    try {
      const result = await sendOrderToCustomerEmail(orderId);
      if (result.sent) {
        loadOrder();
      } else {
        alert(result.error ?? 'Не удалось отправить');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отправить');
    } finally {
      setSendToEmailInProgress(false);
    }
  };

  const handleSaveAll = async () => {
    if (!canEdit || !orderId || !order) return;

    const showSaveError = (message: string) => {
      setSaveToastSuccess(null);
      setSaveToastError(message);
      window.setTimeout(() => setSaveToastError(null), 5000);
    };

    const hasDeliveryEdit = Boolean(
      order.shippingAddressId ||
      order.shippingAddress ||
      order.deliveryType != null ||
      order.shippingCost != null
    );

    let shippingNum = Number(order.shippingCost ?? 0);
    let carryNum: number | null = null;
    let moversCountNum: number | null = null;

    if (hasDeliveryEdit) {
      shippingNum =
        deliveryShippingCost.trim() === ''
          ? Number(order.shippingCost ?? 0)
          : parseFloat(deliveryShippingCost);
      carryNum = deliveryCarryCost.trim() === '' ? null : parseFloat(deliveryCarryCost);
      if (isNaN(shippingNum) || shippingNum < 0) {
        showSaveError('Укажите корректную стоимость доставки (число ≥ 0).');
        return;
      }
      if (carryNum !== null && (isNaN(carryNum) || carryNum < 0)) {
        showSaveError(
          'Укажите корректную стоимость грузчиков (число ≥ 0) или оставьте поле пустым.'
        );
        return;
      }
      moversCountNum = deliveryMoversCount.trim() === '' ? null : parseInt(deliveryMoversCount, 10);
      if (moversCountNum !== null && (isNaN(moversCountNum) || moversCountNum < 0)) {
        showSaveError(
          'Укажите корректное количество грузчиков (целое число ≥ 0) или оставьте поле пустым.'
        );
        return;
      }
    }

    setSaving(true);
    setSaveToastSuccess(null);
    setSaveToastError(null);
    try {
      const items = order.items ?? [];
      const commentsToSave = items.filter((item) => {
        const draft = (commentDraftByItemId[item.id] ?? item.managerComment ?? '').trim();
        const saved = (item.managerComment ?? '').trim();
        return draft !== saved;
      });

      await Promise.all([
        updateAdminOrderCustomer(orderId, {
          customerEmail: customerEmail.trim() || null,
          customerPhone: customerPhone.trim() || null,
          customerFirstName: customerFirstName.trim() || null,
          customerMiddleName: customerMiddleName.trim() || null,
          customerLastName: customerLastName.trim() || null,
        }),
        ...(hasDeliveryEdit
          ? [
              updateAdminOrderDelivery(orderId, {
                shippingCost: shippingNum,
                carryCost: carryNum,
                moversCount: moversCountNum,
                plannedDeliveryDate: deliveryPlannedDate.trim() ? deliveryPlannedDate.trim() : null,
              }),
            ]
          : []),
        ...commentsToSave.map((item) =>
          updateAdminOrderItem(orderId, item.id, {
            managerComment:
              (commentDraftByItemId[item.id] ?? item.managerComment ?? '').trim() || null,
          })
        ),
      ]);

      const fresh = await getAdminOrder(orderId);
      setOrder(normalizeOrder(fresh));
      setSaveToastSuccess('Заказ успешно сохранён');
      window.setTimeout(() => setSaveToastSuccess(null), 3000);
    } catch (err) {
      const message =
        err instanceof Error && err.message.trim()
          ? err.message.trim()
          : 'Не удалось сохранить заказ. Проверьте данные и попробуйте снова.';
      showSaveError(message);
    } finally {
      setSaving(false);
    }
  };

  handleSaveAllRef.current = handleSaveAll;

  const saveButtonState = useAdminStickySaveButton({
    enabled: !loading && Boolean(order) && canEdit,
    loading,
    saving,
    pageHeaderRef,
    onSave: () => void handleSaveAllRef.current(),
  });

  const orderServiceGroups = useMemo((): OrderServiceGroup[] => {
    if (!order) return [];
    return groupOrderServiceItems(order.orderServiceItems ?? []);
  }, [order]);

  const isManagerRole = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role ?? '');
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return {
    orderId,
    order,
    loading,
    error,
    statusUpdating,
    sendBackModalOpen,
    setSendBackModalOpen,
    sendBackComment,
    setSendBackComment,
    sendBackSubmitting,
    approvedNotice,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    deleteSubmitting,
    cancelOrderConfirmOpen,
    setCancelOrderConfirmOpen,
    sendToEmailInProgress,
    deliveryShippingCost,
    setDeliveryShippingCost,
    deliveryCarryCost,
    setDeliveryCarryCost,
    deliveryMoversCount,
    setDeliveryMoversCount,
    deliveryPlannedDate,
    setDeliveryPlannedDate,
    customerEmail,
    setCustomerEmail,
    customerPhone,
    setCustomerPhone,
    customerFirstName,
    setCustomerFirstName,
    customerMiddleName,
    setCustomerMiddleName,
    customerLastName,
    setCustomerLastName,
    saving,
    saveToastSuccess,
    setSaveToastSuccess,
    saveToastError,
    setSaveToastError,
    showOrderHistoryModal,
    setShowOrderHistoryModal,
    refreshing,
    commentDraftByItemId,
    setCommentDraftByItemId,
    orderServiceGroups,
    isManagerRole,
    isSuperAdmin,
    canEdit,
    pageHeaderRef,
    saveButtonState,
    saveButtonPinnedTopPx: saveButtonState.saveButtonPinnedTopPx,
    handleHeaderSaveClick: saveButtonState.handleSaveClick,
    handleRefresh,
    handleStatusChange,
    handleSendBack,
    handleDeleteOrder,
    handleSendToEmail,
  };
}

export type OrderDetailPageModel = ReturnType<typeof useOrderDetailPage>;
