'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  type AdminOrderSummary,
  getAdminOrder,
  getProductsForReplacement,
  sendBackOrderToCustomer,
  updateAdminOrderItem,
  updateAdminOrderStatus,
} from '@/shared/api/admin-orders';

import styles from './page.module.css';

const STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Ожидает' },
  { value: 'PENDING_REVIEW', label: 'На проверке' },
  { value: 'RETURNED_FOR_CORRECTION', label: 'На доработке у покупателя' },
  { value: 'APPROVED', label: 'Проверен' },
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
  returnedForCorrectionAt?: string | null;
  returnedForCorrectionComment?: string | null;
  user?: { id: string; email: string; firstName?: string; lastName?: string; phone?: string };
};

export default function AdminOrderDetailPage() {
  const params = useParams();
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
  const [productsForReplacement, setProductsForReplacement] = useState<
    Awaited<ReturnType<typeof getProductsForReplacement>>
  >([]);

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
    getProductsForReplacement()
      .then(setProductsForReplacement)
      .catch(() => setProductsForReplacement([]));
  }, []);

  const handleStatusChange = async (newStatus: string) => {
    if (!id || !order) return;
    setApprovedNotice(false);
    setStatusUpdating(true);
    try {
      const updated = await updateAdminOrderStatus(id, newStatus);
      setOrder((prev) => (prev ? { ...prev, status: updated.status } : null));
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

  const handleReplaceProduct = async (
    itemId: string,
    productId: string,
    replacementNote: string
  ) => {
    if (!id) return;
    setUpdatingItemId(itemId);
    try {
      const updated = await updateAdminOrderItem(id, itemId, {
        productId,
        replacementNote: replacementNote || undefined,
      });
      setOrder(updated as OrderDetail);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось заменить товар');
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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/orders" className={styles.backLink}>
          ← К списку заказов
        </Link>
        <h1 className={styles.title}>Заказ {order.orderNumber}</h1>
      </div>

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
        <h2 className={styles.sectionTitle}>Состав заказа</h2>
        <table className={styles.itemsTable}>
          <thead>
            <tr>
              <th className={styles.th}>Товар / комментарий и замена</th>
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
                <tr key={`${item.id}-${item.product?.id ?? ''}`} className={styles.tr}>
                  <td className={`${styles.td} ${styles.itemRow}`}>
                    <span className={styles.productName}>{item.product?.name ?? '—'}</span>
                    {(item.size || item.openingSide) && (
                      <span className={styles.itemMeta}>
                        {[item.size, item.openingSide].filter(Boolean).join(', ')}
                      </span>
                    )}
                    {item.replacedFromProduct && (
                      <span className={styles.replacedBadge}>
                        Заменён с: {item.replacedFromProduct.name}
                        {item.replacementNote ? ` — ${item.replacementNote}` : ''}
                      </span>
                    )}
                    <div className={styles.itemActions}>
                      <div className={styles.commentBlock}>
                        <label className={styles.commentLabel} htmlFor={`comment-${item.id}`}>
                          Комментарий для покупателя:
                        </label>
                        <textarea
                          id={`comment-${item.id}`}
                          className={styles.commentInput}
                          defaultValue={item.managerComment ?? ''}
                          placeholder="Размер, цвет и т.п."
                          rows={1}
                        />
                        <button
                          type="button"
                          className={styles.btnSmall}
                          disabled={isUpdating}
                          onClick={() => {
                            const el = document.getElementById(
                              `comment-${item.id}`
                            ) as HTMLTextAreaElement | null;
                            if (el) handleSaveComment(item.id, el.value);
                          }}
                        >
                          {isUpdating ? '…' : 'Сохранить'}
                        </button>
                      </div>
                      <div className={styles.replacementBlock}>
                        <span className={styles.commentLabel}>Заменить товар:</span>
                        <select
                          id={`replace-${item.id}`}
                          className={styles.replaceSelect}
                          aria-label="Выберите товар для замены"
                        >
                          <option value="">— не менять —</option>
                          {productsForReplacement
                            .filter((p) => p.id !== item.product?.id)
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} {p.sku ? `(${p.sku})` : ''} —{' '}
                                {Number(p.price).toLocaleString()} ₽
                              </option>
                            ))}
                        </select>
                        <input
                          type="text"
                          id={`replacement-note-${item.id}`}
                          className={styles.replacementNoteInput}
                          placeholder="Пометка для покупателя"
                        />
                        <button
                          type="button"
                          className={styles.btnSmall}
                          disabled={isUpdating}
                          onClick={() => {
                            const sel = document.getElementById(
                              `replace-${item.id}`
                            ) as HTMLSelectElement | null;
                            const noteEl = document.getElementById(
                              `replacement-note-${item.id}`
                            ) as HTMLInputElement | null;
                            const productId = sel?.value;
                            if (productId) {
                              handleReplaceProduct(item.id, productId, noteEl?.value ?? '');
                            }
                          }}
                        >
                          {isUpdating ? '…' : 'Заменить'}
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
        {canSendBack && (
          <div className={styles.sendBackSection}>
            <button
              type="button"
              className={styles.sendBackButton}
              onClick={() => setSendBackModalOpen(true)}
            >
              Отправить на доработку покупателю
            </button>
          </div>
        )}
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

      {order.shippingAddress && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Адрес доставки</h2>
          <p>
            {order.shippingAddress.firstName} {order.shippingAddress.lastName}
          </p>
          <p className={styles.email}>{order.shippingAddress.phone}</p>
          <p className={styles.address}>
            {order.shippingAddress.street}, {order.shippingAddress.city}
            {order.shippingAddress.region ? `, ${order.shippingAddress.region}` : ''},{' '}
            {order.shippingAddress.postalCode}, {order.shippingAddress.country}
          </p>
        </section>
      )}

      {!order.shippingAddress && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Адрес доставки</h2>
          <p className={styles.muted}>Не указан (заказ на проверке)</p>
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
