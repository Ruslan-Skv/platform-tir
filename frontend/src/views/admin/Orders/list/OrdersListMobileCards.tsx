'use client';

import type { AdminOrderSummary } from '@/shared/api/admin-orders';
import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';
import { DeleteIcon } from '@/shared/ui/icons/DeleteIcon';

import styles from './OrdersPage.module.css';
import { SERVICE_ORDER_STATUS_LABELS } from './orders-page.constants';
import type { OrdersPageOrder } from './orders-page.types';
import {
  formatOrderCurrency,
  formatOrderDate,
  getOrderDetailUrl,
  getOrderStatusLabel,
  getPaymentStatusLabel,
  isServiceOrder,
} from './orders-page.utils';

type OrdersListMobileCardsProps = {
  orders: OrdersPageOrder[];
  loading: boolean;
  isSuperAdmin?: boolean;
  deletingOrderId?: string | null;
  onDeleteOrder?: (order: OrdersPageOrder) => void;
};

function getManagerLabel(order: OrdersPageOrder): string {
  const mgr = isServiceOrder(order)
    ? order.createdByManager
    : (order as AdminOrderSummary).processedByManager;
  if (!mgr) return '—';
  return `${mgr.firstName} ${mgr.lastName}`.trim() || mgr.email || '—';
}

function getCustomerLabel(order: OrdersPageOrder): { name: string; email: string } {
  const productOrder = order as AdminOrderSummary;
  const isManagerCreated = Boolean(productOrder.createdByManagerId);
  const name = isManagerCreated
    ? `${order.customerFirstName ?? ''} ${order.customerLastName ?? ''}`.trim()
    : `${order.customerFirstName ?? productOrder.user?.firstName ?? ''} ${
        order.customerLastName ?? productOrder.user?.lastName ?? ''
      }`.trim();
  const email = isManagerCreated
    ? (order.customerEmail ?? '—')
    : (order.customerEmail ?? productOrder.user?.email ?? '—');
  return { name: name || '—', email };
}

export function OrdersListMobileCards({
  orders,
  loading,
  isSuperAdmin = false,
  deletingOrderId = null,
  onDeleteOrder,
}: OrdersListMobileCardsProps) {
  return (
    <div className={styles.mobileCards} aria-label="Список заказов">
      {loading && orders.length === 0 ? (
        <p className={styles.mobileLoading}>Загрузка…</p>
      ) : orders.length === 0 ? (
        <p className={styles.mobileEmpty}>Нет заказов</p>
      ) : (
        orders.map((order) => {
          const customer = getCustomerLabel(order);
          const paymentStatus =
            isServiceOrder(order) || order.status === 'CANCELLED'
              ? null
              : ((order as AdminOrderSummary).paymentStatus ?? 'PENDING');
          const statusLabel = isServiceOrder(order)
            ? (SERVICE_ORDER_STATUS_LABELS[order.status] ?? order.status)
            : getOrderStatusLabel(order.status);
          const deleteBusy = deletingOrderId === order.id;

          return (
            <div key={order.id} className={styles.mobileCard}>
              <button
                type="button"
                className={styles.mobileCardOpen}
                onClick={() => {
                  window.location.href = getOrderDetailUrl(order);
                }}
              >
                <div className={styles.mobileCardTop}>
                  <div className={styles.mobileCardMain}>
                    <div className={styles.mobileCardName}>
                      {order.orderNumber}
                      {isServiceOrder(order) ? (
                        <span className={styles.serviceOrderBadge}> (услуги)</span>
                      ) : null}
                    </div>
                    <div className={styles.mobileCardMeta}>{customer.name}</div>
                    {customer.email !== '—' ? (
                      <div className={styles.mobileCardMeta}>{customer.email}</div>
                    ) : null}
                  </div>
                  <span className={`${styles.statusBadge} ${styles[`status${order.status}`]}`}>
                    {statusLabel}
                  </span>
                </div>
                <dl className={styles.mobileCardRows}>
                  <div className={styles.mobileCardRow}>
                    <dt>Менеджер</dt>
                    <dd>{getManagerLabel(order)}</dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Оплата</dt>
                    <dd>
                      {paymentStatus ? (
                        <span
                          className={`${styles.paymentBadge} ${styles[`payment${paymentStatus}`]}`}
                        >
                          {getPaymentStatusLabel(paymentStatus)}
                        </span>
                      ) : (
                        <span className={styles.paymentMuted}>—</span>
                      )}
                    </dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Сумма</dt>
                    <dd>
                      {formatOrderCurrency(Number(order.total))}
                      <span className={styles.itemsCount}> · {order.itemsCount} поз.</span>
                    </dd>
                  </div>
                  <div className={styles.mobileCardRow}>
                    <dt>Дата</dt>
                    <dd>{formatOrderDate(order.createdAt)}</dd>
                  </div>
                </dl>
              </button>
              {isSuperAdmin && onDeleteOrder ? (
                <div className={styles.mobileCardActions}>
                  <AdminTableIconButton
                    data-admin-mutation
                    disabled={deletingOrderId !== null && !deleteBusy}
                    aria-busy={deleteBusy}
                    aria-label={deleteBusy ? 'Перемещение в корзину…' : 'В корзину'}
                    title="В корзину"
                    onClick={() => onDeleteOrder(order)}
                  >
                    <DeleteIcon className={deleteBusy ? styles.iconSpinning : undefined} />
                  </AdminTableIconButton>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}
