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

type OrderDetail = AdminOrderSummary & {
  items?: OrderItemDetail[];
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
  submittedForReviewAt?: string | null;
  cancelledAt?: string | null;
  shippedAt?: string | null;
  deliveredAt?: string | null;
  refundedAt?: string | null;
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
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
  const events: OrderHistoryEvent[] = [];
  const push = (at: string | null | undefined, label: string, author: string) => {
    if (at) events.push({ at, label, author });
  };
  push(order.createdAt, 'Заказ создан', 'Покупатель');
  push(order.submittedForReviewAt, 'Отправлен на проверку', 'Покупатель');
  push(order.approvedAt, 'Заказ проверен', 'Менеджер');
  push(order.returnedForCorrectionAt, 'Отправлен на доработку', 'Менеджер');
  push(order.cancelledAt, 'Заказ отменён', 'Менеджер');
  push(order.shippedAt, 'Заказ отправлен', 'Менеджер');
  push(order.deliveredAt, 'Заказ доставлен', 'Менеджер');
  push(order.refundedAt, 'Оформлен возврат', 'Менеджер');
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
  const [deliveryShippingCost, setDeliveryShippingCost] = useState('');
  const [deliveryCarryCost, setDeliveryCarryCost] = useState('');
  const [deliveryMoversCount, setDeliveryMoversCount] = useState('');
  const [deliveryPlannedDate, setDeliveryPlannedDate] = useState('');
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [, setTick] = useState(0);
  /** Черновики рекомендаций по позициям (чтобы кнопка «На доработку» учитывала несохранённый ввод). */
  const [commentDraftByItemId, setCommentDraftByItemId] = useState<Record<string, string>>({});

  const loadOrder = useCallback(() => {
    if (!id) return;
    getAdminOrder(id).then((data) => setOrder(data as OrderDetail));
  }, [id]);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    getAdminOrder(id)
      .then((data) => {
        if (!cancelled) setOrder(data as OrderDetail);
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
    if (!order?.items?.length) return;
    setCommentDraftByItemId((prev) => {
      const next = { ...prev };
      for (const item of order.items) {
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
  }, [
    order?.id,
    order?.shippingCost,
    order?.carryCost,
    order?.moversCount,
    order?.plannedDeliveryDate,
  ]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

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
    if (!id || !order?.items?.length) return;
    setSendBackSubmitting(true);
    try {
      const items = order.items;
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
      setOrder(updated as OrderDetail);
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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <Link href="/admin/orders" className={styles.backLink}>
            ← К списку заказов
          </Link>
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
        <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
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

      <div className={styles.topGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Клиент</h2>
          <p>
            {order.user?.firstName} {order.user?.lastName}
          </p>
          <p className={styles.email}>{order.user?.email}</p>
          {order.user?.phone && <p className={styles.email}>Телефон: {order.user.phone}</p>}
        </section>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>История заказа</h2>
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
                    <span className={styles.orderHistoryTime}>{formatEventDateTime(event.at)}</span>
                    <span className={styles.orderHistoryLabel}>{event.label}</span>
                    <span className={styles.orderHistoryDuration}>{event.duration ?? '—'}</span>
                    <span className={styles.orderHistoryAuthor}>{event.author}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
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

      {(order.shippingAddress || order.deliveryType || order.shippingCost != null) && (
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
          {(order.shippingAddress || order.deliveryType != null || order.shippingCost != null) && (
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
                    setOrder(updated as OrderDetail);
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
