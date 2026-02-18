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
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
};

function formatReviewDuration(ms: number): string {
  if (ms < 0) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} мин`);
  return parts.join(' ');
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
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [approvedNotice, setApprovedNotice] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deliveryShippingCost, setDeliveryShippingCost] = useState('');
  const [deliveryCarryCost, setDeliveryCarryCost] = useState('');
  const [deliveryMoversCount, setDeliveryMoversCount] = useState('');
  const [deliveryPlannedDate, setDeliveryPlannedDate] = useState('');
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [, setTick] = useState(0);

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

  const handleSaveComment = async (itemId: string, managerComment: string) => {
    if (!id) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await updateAdminOrderItem(id, itemId, {
        managerComment: managerComment || null,
      });
      setOrder(updated as OrderDetail);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить комментарий');
    } finally {
      setUpdatingItemId(null);
    }
  };

  const handleSendBack = async () => {
    if (!id) return;
    setSendBackSubmitting(true);
    try {
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

      {canSendBack && (
        <div className={styles.sendBackSection}>
          <button
            type="button"
            className={styles.sendBackButton}
            onClick={
              order.status === 'RETURNED_FOR_CORRECTION'
                ? undefined
                : () => setSendBackModalOpen(true)
            }
            disabled={order.status === 'RETURNED_FOR_CORRECTION'}
          >
            {order.status === 'RETURNED_FOR_CORRECTION'
              ? 'Заказ на доработке'
              : 'Отправить на доработку покупателю'}
          </button>
        </div>
      )}

      <div className={styles.topGrid}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Статус</h2>
          <select
            value={order.status}
            onChange={(e) => handleStatusChange(e.target.value)}
            disabled={statusUpdating}
            className={styles.select}
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
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
        </section>
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
        <h2 className={styles.sectionTitle}>Проверка заказа</h2>
        <div className={styles.reviewTimeline}>
          <div className={styles.reviewTimelineRow}>
            <span className={styles.reviewTimelineLabel}>Принят на проверку:</span>
            <span className={styles.reviewTimelineValue}>
              {order.submittedForReviewAt || order.createdAt
                ? new Date(order.submittedForReviewAt || order.createdAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          <div className={styles.reviewTimelineRow}>
            <span className={styles.reviewTimelineLabel}>Проверка выполнена:</span>
            <span className={styles.reviewTimelineValue}>
              {order.approvedAt
                ? new Date(order.approvedAt).toLocaleString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '—'}
            </span>
          </div>
          <div className={styles.reviewTimelineRow}>
            <span className={styles.reviewTimelineLabel}>Продолжительность проверки:</span>
            <span className={styles.reviewTimelineValue}>
              {order.approvedAt && (order.submittedForReviewAt || order.createdAt)
                ? formatReviewDuration(
                    new Date(order.approvedAt).getTime() -
                      new Date(order.submittedForReviewAt || order.createdAt).getTime()
                  )
                : '—'}
            </span>
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
              const isUpdating = updatingItemId === item.id;
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
                          defaultValue={item.managerComment ?? ''}
                          placeholder="Например: рекомендуем заменить на… или изменить количество на…"
                          rows={2}
                        />
                        <button
                          type="button"
                          className={styles.btnSmall}
                          disabled={isUpdating}
                          onClick={() => {
                            const el = document.getElementById(
                              `comment-${item.id}`
                            ) as HTMLTextAreaElement | null;
                            if (el) handleSaveComment(item.id, el.value.trim());
                          }}
                        >
                          {isUpdating ? '…' : 'Сохранить'}
                        </button>
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
          {order.shippingAddress ? (
            <>
              <p>
                {order.shippingAddress.firstName} {order.shippingAddress.lastName}
              </p>
              <p className={styles.email}>{order.shippingAddress.phone}</p>
              <p className={styles.address}>
                {order.shippingAddress.street}, {order.shippingAddress.city}
                {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''},{' '}
                {order.shippingAddress.postalCode}, {order.shippingAddress.country}
              </p>
            </>
          ) : (
            <p className={styles.muted}>Адрес не указан</p>
          )}
          {(order.deliveryType || order.shippingCost != null) && (
            <div className={styles.deliveryDetails}>
              {order.deliveryType && (
                <p>
                  Тип доставки:{' '}
                  {order.deliveryType === 'TO_APARTMENT' ? 'до квартиры' : 'до подъезда'}
                </p>
              )}
              {order.deliveryType === 'TO_APARTMENT' && (
                <>
                  {order.deliveryFloor != null && <p>Этаж: {order.deliveryFloor}</p>}
                  {order.deliveryHasElevator != null && (
                    <p>Лифт: {order.deliveryHasElevator ? 'да' : 'нет'}</p>
                  )}
                </>
              )}
              {order.preferredDeliveryTime && (
                <p>Удобная дата доставки (покупатель): {order.preferredDeliveryTime}</p>
              )}
              {order.moversCount != null && <p>Количество грузчиков: {order.moversCount}</p>}
              {order.plannedDeliveryDate && (
                <p>
                  Планируемая дата доставки:{' '}
                  {new Date(order.plannedDeliveryDate).toLocaleDateString('ru-RU')}
                </p>
              )}
              {(order.shippingCost != null || order.carryCost != null) && (
                <div className={styles.deliveryCostSummary}>
                  <p className={styles.deliveryCostSummaryTitle}>Итоговая стоимость доставки</p>
                  <p className={styles.deliveryCostSummaryLine}>
                    Доставка: {formatPrice(order.shippingCost ?? 0)}
                  </p>
                  {order.carryCost != null && Number(order.carryCost) > 0 && (
                    <p className={styles.deliveryCostSummaryLine}>
                      {order.moversCount != null && order.moversCount > 0
                        ? `${order.moversCount} грузчик${order.moversCount === 1 ? '' : order.moversCount < 5 ? 'а' : 'ов'}: `
                        : 'Грузчики: '}
                      {formatPrice(order.carryCost)}
                    </p>
                  )}
                  <p className={styles.deliveryCostSummaryTotal}>
                    Итого стоимость доставки:{' '}
                    {(
                      Number(order.shippingCost ?? 0) + Number(order.carryCost ?? 0)
                    ).toLocaleString('ru-RU')}{' '}
                    ₽
                  </p>
                </div>
              )}
            </div>
          )}
          {(order.shippingAddress || order.deliveryType != null || order.shippingCost != null) && (
            <div className={styles.deliveryCostEdit}>
              <p className={styles.deliveryCostEditTitle}>
                Стоимость и параметры доставки (редактирование)
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
