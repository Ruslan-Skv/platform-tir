'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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
import { formatApprovalCountdown, getApprovalRemainingMs } from '@/shared/api/user-orders';

import styles from './page.module.css';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Ожидает' },
  { value: 'PENDING_REVIEW', label: 'На проверке' },
  { value: 'RETURNED_FOR_CORRECTION', label: 'На доработке у покупателя' },
  { value: 'APPROVED', label: 'Заказ проверен' },
  { value: 'PROCESSING', label: 'В обработке' },
  { value: 'SHIPPED', label: 'Отправлен' },
  { value: 'DELIVERED', label: 'Доставлен' },
  { value: 'CANCELLED', label: 'Отменён' },
  { value: 'REFUNDED', label: 'Возврат' },
];

type OrderItemDetail = {
  id: string;
  quantity: number;
  price: string | number;
  size?: string | null;
  openingSide?: string | null;
  managerComment?: string | null;
  replacementNote?: string | null;
  replacedFromProductId?: string | null;
  product?: {
    id: string;
    name: string;
    slug?: string;
    sku?: string;
    images?: string[] | null;
  };
  replacedFromProduct?: {
    id: string;
    name: string;
    sku?: string | null;
  } | null;
};

type ShippingAddress = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  street: string;
  city: string;
  region?: string | null;
  postalCode: string;
  country: string;
};

type OrderDetail = Omit<AdminOrderSummary, 'items'> & {
  items?: OrderItemDetail[];
  shippingAddressId?: string | null;
  shippingAddress?: ShippingAddress | null;
  shippingCost?: string | number;
  carryCost?: string | number | null;
  moversCount?: number | null;
  plannedDeliveryDate?: string | null;
  deliveryType?: string | null;
  deliveryFloor?: number | null;
  deliveryHasElevator?: boolean | null;
  preferredDeliveryTime?: string | null;
  returnedForCorrectionAt?: string | null;
  returnedForCorrectionComment?: string | null;
  approvedAt?: string | null;
  sentToEmailAt?: string | null;
  customerEmail?: string | null;
  submittedForReviewAt?: string | null;
  cancelledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  refundedAt?: string | null;
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
  processedByManager?: { id: string; email: string; firstName?: string; lastName?: string };
  orderEvents?: Array<{
    id: string;
    createdAt: string;
    type: string;
    actor: string;
    user?: { id: string; email: string; firstName?: string; lastName?: string } | null;
  }>;
};

const ORDER_EVENT_LABELS: Record<string, string> = {
  created: 'Заказ создан',
  submitted_for_review: 'Отправлен на проверку',
  add_to_review: 'Добавлены товары к заказу на проверке',
  add_to_approved: 'Добавлены товары к проверенному заказу',
  approved: 'Заказ проверен',
  returned_for_correction: 'Отправлен на доработку',
  cancelled: 'Заказ отменён',
  shipped: 'Заказ отправлен',
  delivered: 'Заказ доставлен',
  refunded: 'Оформлен возврат',
  delivery_edited: 'Изменены стоимость или дата доставки',
  customer_edited: 'Изменены данные покупателя',
  item_comment_edited: 'Изменены рекомендации по позиции',
  sent_to_email: 'Заказ отправлен на email покупателю',
};

type OrderHistoryEvent = {
  at: string;
  label: string;
  author: string;
  duration?: string;
};

function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} мин`);
  return parts.join(' ');
}

/** Формат для счётчика проверки: минуты:секунды (например 12:35). */
function formatDurationMinutesSeconds(ms: number): string {
  if (ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function buildOrderHistory(order: OrderDetail): OrderHistoryEvent[] {
  const managerName = order.processedByManager
    ? `${order.processedByManager.firstName ?? ''} ${order.processedByManager.lastName ?? ''}`.trim() ||
      order.processedByManager.email
    : 'Менеджер';
  const customerName = `${order.customerFirstName ?? order.user?.firstName ?? ''} ${
    order.customerLastName ?? order.user?.lastName ?? ''
  }`.trim();
  const customerLabel = customerName || order.customerEmail || order.user?.email || 'Покупатель';

  if (order.orderEvents && order.orderEvents.length > 0) {
    const fromEvents: OrderHistoryEvent[] = order.orderEvents.map((e) => {
      const author =
        e.actor === 'manager' && e.user
          ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() ||
            e.user.email ||
            'Менеджер'
          : e.actor === 'customer'
            ? customerLabel
            : e.user
              ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() || e.user.email || '—'
              : '—';
      return {
        at: e.createdAt,
        label: ORDER_EVENT_LABELS[e.type] ?? e.type,
        author,
      };
    });
    const firstEventAt =
      fromEvents.length > 0 ? Math.min(...fromEvents.map((e) => new Date(e.at).getTime())) : 0;
    const creatorLabel = order.createdByManagerId ? managerName : customerLabel;
    const legacy: OrderHistoryEvent[] = [];
    if (order.createdAt && new Date(order.createdAt).getTime() < firstEventAt) {
      legacy.push({ at: order.createdAt, label: 'Заказ создан', author: creatorLabel });
    }
    if (
      order.submittedForReviewAt &&
      new Date(order.submittedForReviewAt).getTime() < firstEventAt
    ) {
      legacy.push({
        at: order.submittedForReviewAt,
        label: 'Отправлен на проверку',
        author: creatorLabel,
      });
    }
    if (order.approvedAt && new Date(order.approvedAt).getTime() < firstEventAt) {
      legacy.push({ at: order.approvedAt, label: 'Заказ проверен', author: managerName });
    }
    if (
      order.returnedForCorrectionAt &&
      new Date(order.returnedForCorrectionAt).getTime() < firstEventAt
    ) {
      legacy.push({
        at: order.returnedForCorrectionAt,
        label: 'Отправлен на доработку',
        author: managerName,
      });
    }
    const events = [...legacy, ...fromEvents];
    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].at).getTime();
      const curr = new Date(events[i].at).getTime();
      events[i].duration = formatDuration(curr - prev);
    }
    return events;
  }

  const events: OrderHistoryEvent[] = [];
  const push = (at: string | null | undefined, label: string, author: string) => {
    if (at) events.push({ at, label, author });
  };
  const creatorLabel = order.createdByManagerId ? managerName : customerLabel;

  push(order.createdAt, 'Заказ создан', creatorLabel);
  push(order.submittedForReviewAt, 'Отправлен на проверку', creatorLabel);
  push(order.approvedAt, 'Заказ проверен', managerName);
  push(order.returnedForCorrectionAt, 'Отправлен на доработку', managerName);
  push(order.cancelledAt, 'Заказ отменён', managerName);
  push(order.shippedAt, 'Заказ отправлен', managerName);
  push(order.deliveredAt, 'Заказ доставлен', managerName);
  push(order.refundedAt, 'Оформлен возврат', managerName);
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].at).getTime();
    const curr = new Date(events[i].at).getTime();
    events[i].duration = formatDuration(curr - prev);
  }
  return events;
}

function formatEventDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
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
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerFirstName, setCustomerFirstName] = useState('');
  const [customerLastName, setCustomerLastName] = useState('');
  const [customerSaving, setCustomerSaving] = useState(false);
  const [customerSaveSuccess, setCustomerSaveSuccess] = useState(false);
  const [, setTick] = useState(0);
  const [showOrderHistoryModal, setShowOrderHistoryModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  /** Черновики рекомендаций по позициям (чтобы кнопка «На доработку» учитывала несохранённый ввод). */
  const [commentDraftByItemId, setCommentDraftByItemId] = useState<Record<string, string>>({});

  const normalizeOrder = useCallback((data: AdminOrderSummary & { items?: unknown[] }) => {
    return {
      ...(data as OrderDetail),
      items: Array.isArray(data.items) ? (data.items as OrderItemDetail[]) : [],
    } satisfies OrderDetail;
  }, []);

  const loadOrder = useCallback(() => {
    if (!id) return;
    getAdminOrder(id).then((data) => setOrder(normalizeOrder(data)));
  }, [id, normalizeOrder]);

  const handleRefresh = useCallback(() => {
    if (!id) return;
    setRefreshing(true);
    getAdminOrder(id)
      .then((data) => setOrder(normalizeOrder(data)))
      .catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки'))
      .finally(() => setRefreshing(false));
  }, [id, normalizeOrder]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getAdminOrder(id)
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
  }, [id]);

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
  }, [order?.id, order?.items]);

  useEffect(() => {
    if (!order) return;
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
      order.createdByManagerId
        ? (order.customerEmail ?? '')
        : (order.customerEmail ?? order.user?.email ?? '')
    );
    setCustomerFirstName(
      order.createdByManagerId
        ? (order.customerFirstName ?? '')
        : (order.customerFirstName ?? order.user?.firstName ?? '')
    );
    setCustomerLastName(
      order.createdByManagerId
        ? (order.customerLastName ?? '')
        : (order.customerLastName ?? order.user?.lastName ?? '')
    );
  }, [
    order?.id,
    order?.shippingCost,
    order?.carryCost,
    order?.moversCount,
    order?.plannedDeliveryDate,
    order?.customerEmail,
    order?.customerFirstName,
    order?.customerLastName,
    order?.user?.email,
    order?.user?.firstName,
    order?.user?.lastName,
  ]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Периодическое обновление заказа, чтобы видеть изменения со стороны покупателя (публичка)
  const POLL_INTERVAL_MS = 15000;
  useEffect(() => {
    if (!id || !order || loading) return;
    const intervalId = setInterval(() => {
      getAdminOrder(id)
        .then((data) => setOrder(normalizeOrder(data)))
        .catch(() => {});
    }, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [id, order?.id, loading, normalizeOrder]);

  // Обновить при возврате на вкладку (например, после действий в публичке)
  useEffect(() => {
    if (!id || !order) return;
    const onFocus = () => {
      getAdminOrder(id)
        .then((data) => setOrder(normalizeOrder(data)))
        .catch(() => {});
    };
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [id, order?.id, normalizeOrder]);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !order) return;
    setApprovedNotice(false);
    setStatusUpdating(true);
    try {
      const updated = await updateAdminOrderStatus(id, newStatus);
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
    if (!id || !order) return;
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
          updateAdminOrderItem(id, item.id, {
            managerComment:
              (commentDraftByItemId[item.id] ?? item.managerComment ?? '').trim() || null,
          })
        )
      );
      const updated = await sendBackOrderToCustomer(id, sendBackComment || undefined);
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
    if (!id) return;
    setDeleteSubmitting(true);
    try {
      await deleteAdminOrder(id);
      setDeleteConfirmOpen(false);
      router.push('/admin/orders');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось удалить заказ');
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleSendToEmail = async () => {
    if (!id) return;
    setSendToEmailInProgress(true);
    try {
      const result = await sendOrderToCustomerEmail(id);
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

  const handleSaveCustomer = async () => {
    if (!id) return;
    setCustomerSaving(true);
    setCustomerSaveSuccess(false);
    try {
      const updated = await updateAdminOrderCustomer(id, {
        customerEmail: customerEmail.trim() || null,
        customerFirstName: customerFirstName.trim() || null,
        customerLastName: customerLastName.trim() || null,
      });
      setOrder(normalizeOrder(updated));
      setCustomerSaveSuccess(true);
      window.setTimeout(() => setCustomerSaveSuccess(false), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось обновить данные покупателя');
    } finally {
      setCustomerSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка заказа...</div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>{error ?? 'Заказ не найден'}</p>
        <Link href="/admin/orders" className={styles.backLink}>
          ← К списку заказов
        </Link>
      </div>
    );
  }

  const total = Number(order.total);
  const items = order.items ?? [];
  const formatPrice = (value: string | number) =>
    Number(value).toLocaleString('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      maximumFractionDigits: 0,
    });

  const canSendBack =
    order.status === 'PENDING_REVIEW' ||
    order.status === 'APPROVED' ||
    order.status === 'RETURNED_FOR_CORRECTION';

  const canSendToEmail =
    order.status === 'APPROVED' &&
    !order.sentToEmailAt &&
    (order.createdByManagerId ? order.customerEmail : order.user?.email || order.customerEmail);
  const isManagerRole = ['ADMIN', 'SUPER_ADMIN', 'MANAGER'].includes(user?.role ?? '');
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/admin/orders" className={styles.backLink}>
            ← К списку заказов
          </Link>
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.refreshButton}
              onClick={handleRefresh}
              disabled={refreshing}
              title="Обновить данные заказа"
            >
              {refreshing ? 'Обновление…' : 'Обновить'}
            </button>
            {isSuperAdmin && (
              <button
                type="button"
                className={styles.deleteButton}
                onClick={() => setDeleteConfirmOpen(true)}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Удаление…' : 'Удалить заказ'}
              </button>
            )}
          </div>
        </div>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
          <span className={styles.managerInline}>
            {order.processedByManager ? (
              <>
                Менеджер: {order.processedByManager.firstName} {order.processedByManager.lastName}
                {order.processedByManager.email && <> · {order.processedByManager.email}</>}
              </>
            ) : (
              <span className={styles.mutedText}>Менеджер ещё не назначен</span>
            )}
          </span>
          <button
            type="button"
            className={styles.historyActionButton}
            onClick={() => setShowOrderHistoryModal(true)}
            title="История заказа"
            aria-label="История заказа"
          >
            📋 История
          </button>
        </div>
        <p className={styles.currentStatus}>
          Статус:{' '}
          <span className={`${styles.statusBadge} ${styles[`status${order.status}`] ?? ''}`}>
            {STATUS_OPTIONS.find((o) => o.value === order.status)?.label ?? order.status}
          </span>
          {order.status === 'PENDING_REVIEW' && order.submittedForReviewAt && (
            <>
              {' · '}
              <span className={styles.currentStatusHighlight}>
                {formatDurationMinutesSeconds(
                  Date.now() - new Date(order.submittedForReviewAt).getTime()
                )}
              </span>
            </>
          )}
        </p>
      </div>

      {deleteConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !deleteSubmitting && setDeleteConfirmOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Удалить заказ <strong>{order.orderNumber}</strong>? Это действие нельзя отменить.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleteSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.modalConfirmDelete}
                onClick={handleDeleteOrder}
                disabled={deleteSubmitting}
              >
                {deleteSubmitting ? 'Удаление…' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelOrderConfirmOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !statusUpdating && setCancelOrderConfirmOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <p className={styles.modalText}>
              Отменить заказ <strong>{order.orderNumber}</strong>? Покупатель сможет оформить заказ
              заново из корзины.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setCancelOrderConfirmOpen(false)}
                disabled={statusUpdating}
              >
                Нет
              </button>
              <button
                type="button"
                className={styles.modalConfirmDelete}
                onClick={async () => {
                  await handleStatusChange('CANCELLED');
                  setCancelOrderConfirmOpen(false);
                }}
                disabled={statusUpdating}
              >
                {statusUpdating ? 'Отмена…' : 'Да, отменить заказ'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={styles.actionsRow}>
        {canSendBack &&
          (() => {
            const hasCommentsForCustomer = (order.items ?? []).some((item) => {
              const value = commentDraftByItemId[item.id] ?? item.managerComment ?? '';
              return typeof value === 'string' && value.trim().length > 0;
            });
            const sendBackDisabled =
              order.status === 'RETURNED_FOR_CORRECTION' || !hasCommentsForCustomer;
            return (
              <button
                type="button"
                className={styles.sendBackButton}
                onClick={sendBackDisabled ? undefined : () => setSendBackModalOpen(true)}
                disabled={sendBackDisabled}
                title={
                  !hasCommentsForCustomer
                    ? 'Сначала оставьте рекомендации для покупателя в составе заказа (комментарии к позициям)'
                    : undefined
                }
              >
                {order.status === 'RETURNED_FOR_CORRECTION'
                  ? 'Заказ на доработке'
                  : 'Отправить на доработку покупателю'}
              </button>
            );
          })()}
        {order.status === 'PENDING_REVIEW' && (
          <button
            type="button"
            className={styles.approveButton}
            onClick={() => handleStatusChange('APPROVED')}
            disabled={statusUpdating}
          >
            {statusUpdating ? 'Сохранение…' : 'Заказ проверен'}
          </button>
        )}
        {canSendToEmail && isManagerRole && (
          <button
            type="button"
            className={styles.approveButton}
            onClick={handleSendToEmail}
            disabled={sendToEmailInProgress}
            title="Отправить заказ на email покупателя для ознакомления и оплаты"
          >
            {sendToEmailInProgress ? 'Отправка…' : 'Отправить на email покупателя'}
          </button>
        )}
        {order.sentToEmailAt && (
          <span className={styles.sentToEmailBadge} role="status">
            Отправлено на email {new Date(order.sentToEmailAt).toLocaleString('ru-RU')}
          </span>
        )}
        {!['CANCELLED', 'DELIVERED', 'REFUNDED'].includes(order.status) && (
          <button
            type="button"
            className={styles.cancelOrderButton}
            onClick={() => setCancelOrderConfirmOpen(true)}
            disabled={statusUpdating}
          >
            {statusUpdating ? '…' : 'Отменить заказ'}
          </button>
        )}
      </div>
      {statusUpdating && <span className={styles.saving}>Сохранение...</span>}
      {approvedNotice && (
        <p className={styles.approvedNotice} role="status">
          Покупатель может продолжить оформление заказа
        </p>
      )}
      {order.status === 'APPROVED' && order.approvedAt && (
        <p className={styles.approvalCountdown}>
          Осталось для оформления покупателем:{' '}
          <span className={styles.approvalCountdownTime}>
            {formatApprovalCountdown(getApprovalRemainingMs(order.approvedAt))}
          </span>
        </p>
      )}

      <section className={`${styles.section} ${styles.clientSection}`}>
        <h2 className={styles.sectionTitle}>Клиент</h2>
        <div className={styles.clientRow}>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Email</label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className={styles.input}
              placeholder="customer@example.com"
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Фамилия</label>
            <input
              type="text"
              value={customerFirstName}
              onChange={(e) => setCustomerFirstName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Имя</label>
            <input
              type="text"
              value={customerLastName}
              onChange={(e) => setCustomerLastName(e.target.value)}
              className={styles.input}
            />
          </div>
          <div className={styles.clientField}>
            <label className={styles.inputLabel}>Отчество</label>
            <input
              type="text"
              value={customerLastName}
              onChange={(e) => setCustomerLastName(e.target.value)}
              className={styles.input}
            />
          </div>
          {order.user?.phone && (
            <div className={styles.clientField}>
              <span className={styles.inputLabel}>Телефон</span>
              <span className={styles.clientPhone}>{order.user.phone}</span>
            </div>
          )}
          <div className={styles.clientActions}>
            <button
              type="button"
              className={styles.saveButton}
              onClick={handleSaveCustomer}
              disabled={customerSaving}
            >
              {customerSaving ? 'Сохранение…' : 'Сохранить'}
            </button>
            {customerSaveSuccess && (
              <span className={styles.inlineSuccess} role="status">
                Сохранено
              </span>
            )}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Состав заказа</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.th}>Товар / комментарий менеджера</th>
              <th className={styles.th}>Артикул</th>
              <th className={styles.th}>Кол-во</th>
              <th className={styles.th}>Цена</th>
              <th className={styles.th}>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const price = Number(item.price);
              const lineTotal = price * item.quantity;
              return (
                <tr key={item.id} className={styles.tr}>
                  <td className={`${styles.td} ${styles.itemRow}`}>
                    <span className={styles.productName}>{item.product?.name ?? '—'}</span>
                    {(item.size || item.openingSide) && (
                      <span className={styles.itemMeta}>
                        {[item.size, item.openingSide].filter(Boolean).join(', ')}
                      </span>
                    )}
                    <div className={styles.itemActions}>
                      <div className={styles.commentBlock}>
                        <label className={styles.commentLabel} htmlFor={`comment-${item.id}`}>
                          Рекомендации для покупателя (замена, количество и т.п.):
                        </label>
                        <textarea
                          id={`comment-${item.id}`}
                          className={styles.commentInput}
                          value={commentDraftByItemId[item.id] ?? item.managerComment ?? ''}
                          onChange={(e) =>
                            setCommentDraftByItemId((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Например: рекомендуем заменить на… или изменить количество на…"
                          rows={2}
                        />
                      </div>
                    </div>
                  </td>
                  <td className={styles.td}>{item.product?.sku ?? '—'}</td>
                  <td className={styles.td}>{item.quantity}</td>
                  <td className={styles.td}>{formatPrice(price)}</td>
                  <td className={styles.td}>{formatPrice(lineTotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <p className={styles.total}>Итого: {formatPrice(total)}</p>
      </section>

      {sendBackModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => !sendBackSubmitting && setSendBackModalOpen(false)}
        >
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Отправить заказ на доработку</h3>
            <p className={styles.muted} style={{ marginBottom: '0.5rem' }}>
              Покупатель получит уведомление и сможет внести правки. Укажите общий комментарий
              (опционально):
            </p>
            <textarea
              className={styles.modalTextarea}
              value={sendBackComment}
              onChange={(e) => setSendBackComment(e.target.value)}
              placeholder="Например: уточните, пожалуйста, размер двери и адрес доставки"
            />
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.modalCancel}
                onClick={() => setSendBackModalOpen(false)}
                disabled={sendBackSubmitting}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.modalConfirm}
                onClick={handleSendBack}
                disabled={sendBackSubmitting}
              >
                {sendBackSubmitting ? 'Отправка…' : 'Отправить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showOrderHistoryModal && (
        <div className={styles.modalOverlay} onClick={() => setShowOrderHistoryModal(false)}>
          <div className={styles.historyModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.historyModalHeader}>
              <h3 className={styles.historyModalTitle}>История заказа {order.orderNumber}</h3>
              <button
                type="button"
                className={styles.historyModalClose}
                onClick={() => setShowOrderHistoryModal(false)}
                aria-label="Закрыть"
              >
                ×
              </button>
            </div>
            <div className={styles.orderHistory}>
              {buildOrderHistory(order).length === 0 ? (
                <p className={styles.orderHistoryEmpty}>Нет событий</p>
              ) : (
                <>
                  <div className={styles.orderHistoryHeader}>
                    <span className={styles.orderHistoryTime}>Дата и время</span>
                    <span className={styles.orderHistoryLabel}>Событие</span>
                    <span className={styles.orderHistoryDuration}>Продолжительность</span>
                    <span className={styles.orderHistoryAuthor}>Автор</span>
                  </div>
                  <ul className={styles.orderHistoryList}>
                    {buildOrderHistory(order).map((event) => (
                      <li key={`${event.at}-${event.label}`} className={styles.orderHistoryItem}>
                        <span className={styles.orderHistoryTime}>
                          {formatEventDateTime(event.at)}
                        </span>
                        <span className={styles.orderHistoryLabel}>{event.label}</span>
                        <span className={styles.orderHistoryDuration}>{event.duration ?? '—'}</span>
                        <span className={styles.orderHistoryAuthor}>{event.author}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {(order.shippingAddressId ||
        order.shippingAddress ||
        order.deliveryType ||
        order.shippingCost != null) && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Доставка</h2>
          <div className={styles.deliveryCompact}>
            <div className={styles.deliveryCompactLeft}>
              {order.shippingAddress ? (
                <>
                  <p>
                    {order.shippingAddress.firstName} {order.shippingAddress.lastName}
                    {order.shippingAddress.phone && ` · ${order.shippingAddress.phone}`}
                  </p>
                  <p className={styles.address}>
                    {order.shippingAddress.street}, {order.shippingAddress.city}
                    {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''},{' '}
                    {order.shippingAddress.postalCode}
                  </p>
                </>
              ) : (
                <p className={styles.muted}>Адрес не указан</p>
              )}
              {(order.deliveryType || order.shippingCost != null) && (
                <div className={styles.deliveryDetails}>
                  {order.deliveryType && (
                    <p>
                      {order.deliveryType === 'TO_APARTMENT' ? 'До квартиры' : 'До подъезда'}
                      {order.deliveryType === 'TO_APARTMENT' &&
                        order.deliveryFloor != null &&
                        `, ${order.deliveryFloor} эт.`}
                      {order.deliveryHasElevator != null &&
                        `, лифт: ${order.deliveryHasElevator ? 'да' : 'нет'}`}
                    </p>
                  )}
                  {order.preferredDeliveryTime && <p>Удобно: {order.preferredDeliveryTime}</p>}
                  {order.moversCount != null && <p>Грузчиков: {order.moversCount}</p>}
                  {order.plannedDeliveryDate && (
                    <p>План: {new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU')}</p>
                  )}
                </div>
              )}
            </div>
            {(order.shippingCost != null || order.carryCost != null) && (
              <div className={styles.deliveryCompactRight}>
                <div className={styles.deliveryCostSummary}>
                  <p className={styles.deliveryCostSummaryTitle}>Стоимость доставки</p>
                  <p className={styles.deliveryCostSummaryLine}>
                    Доставка: {formatPrice(order.shippingCost ?? 0)}
                  </p>
                  {order.carryCost != null && Number(order.carryCost) > 0 && (
                    <p className={styles.deliveryCostSummaryLine}>
                      {order.moversCount != null && order.moversCount > 0
                        ? `${order.moversCount} грузч.: `
                        : 'Грузчики: '}
                      {formatPrice(order.carryCost)}
                    </p>
                  )}
                  <p className={styles.deliveryCostSummaryTotal}>
                    Итого:{' '}
                    {(
                      Number(order.shippingCost ?? 0) + Number(order.carryCost ?? 0)
                    ).toLocaleString('ru-RU')}{' '}
                    ₽
                  </p>
                </div>
              </div>
            )}
          </div>
          {(order.shippingAddressId ||
            order.shippingAddress ||
            order.deliveryType != null ||
            order.shippingCost != null) && (
            <div className={styles.deliveryCostEdit}>
              <p className={styles.deliveryCostEditTitle}>
                Редактирование стоимости и даты доставки
              </p>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Стоимость доставки, ₽
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryShippingCost}
                    onChange={(e) => setDeliveryShippingCost(e.target.value)}
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Стоимость грузчиков, ₽
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryCarryCost}
                    onChange={(e) => setDeliveryCarryCost(e.target.value)}
                    placeholder="0 или пусто"
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Количество грузчиков
                  <input
                    type="number"
                    min={0}
                    step={1}
                    value={deliveryMoversCount}
                    onChange={(e) => setDeliveryMoversCount(e.target.value)}
                    placeholder="0 или пусто"
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <div className={styles.deliveryCostEditRow}>
                <label className={styles.deliveryCostEditLabel}>
                  Планируемая дата доставки
                  <input
                    type="date"
                    value={deliveryPlannedDate}
                    onChange={(e) => setDeliveryPlannedDate(e.target.value)}
                    className={styles.deliveryCostInput}
                  />
                </label>
              </div>
              <button
                type="button"
                className={styles.deliveryCostSaveBtn}
                disabled={deliverySaving}
                onClick={async () => {
                  const shippingNum =
                    deliveryShippingCost.trim() === ''
                      ? Number(order.shippingCost ?? 0)
                      : parseFloat(deliveryShippingCost);
                  const carryNum =
                    deliveryCarryCost.trim() === '' ? null : parseFloat(deliveryCarryCost);
                  if (isNaN(shippingNum) || shippingNum < 0) {
                    alert('Укажите корректную стоимость доставки');
                    return;
                  }
                  if (carryNum !== null && (isNaN(carryNum) || carryNum < 0)) {
                    alert('Укажите корректную стоимость грузчиков');
                    return;
                  }
                  const moversCountNum =
                    deliveryMoversCount.trim() === '' ? null : parseInt(deliveryMoversCount, 10);
                  if (moversCountNum !== null && (isNaN(moversCountNum) || moversCountNum < 0)) {
                    alert('Укажите корректное количество грузчиков');
                    return;
                  }
                  setDeliverySaving(true);
                  try {
                    const updated = await updateAdminOrderDelivery(id, {
                      shippingCost: shippingNum,
                      carryCost: carryNum,
                      moversCount: moversCountNum,
                      plannedDeliveryDate: deliveryPlannedDate.trim()
                        ? deliveryPlannedDate.trim()
                        : null,
                    });
                    setOrder(normalizeOrder(updated));
                  } catch (err) {
                    alert(err instanceof Error ? err.message : 'Не удалось сохранить');
                  } finally {
                    setDeliverySaving(false);
                  }
                }}
              >
                {deliverySaving ? 'Сохранение…' : 'Сохранить'}
              </button>
            </div>
          )}
        </section>
      )}

      {order.returnedForCorrectionAt && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Последняя отправка на доработку</h2>
          <p className={styles.muted}>
            {new Date(order.returnedForCorrectionAt).toLocaleString('ru-RU')}
          </p>
          {order.returnedForCorrectionComment && (
            <p style={{ marginTop: '0.25rem' }}>{order.returnedForCorrectionComment}</p>
          )}
        </section>
      )}
    </div>
  );
}
