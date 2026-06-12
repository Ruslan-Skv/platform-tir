'use client';

import { useEffect, useState } from 'react';

import { getAdminUserCabinetData } from '@/shared/api/admin-user-cabinet';
import type { UserCabinetData } from '@/shared/api/admin-user-cabinet';
import { Modal } from '@/shared/ui/Modal';
import type { BackendRole } from '@/views/admin/Settings/rolesConfig';

import styles from './UsersPage.module.css';
import { ROLE_LABELS } from './users-page.constants';
import type { AdminUser } from './users-page.types';

type ViewCabinetModalProps = {
  user: AdminUser;
  onClose: () => void;
};

export function ViewCabinetModal({ user, onClose }: ViewCabinetModalProps) {
  const [data, setData] = useState<UserCabinetData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getAdminUserCabinetData(user.id)
      .then((res) => {
        if (!cancelled) setData(res);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user.id]);

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const formatPrice = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(num);
  };

  return (
    <Modal isOpen onClose={onClose} title={`Личный кабинет: ${user.email}`} size="xl">
      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : data ? (
        <div className={styles.cabinetModal}>
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Профиль</h3>
            <dl className={styles.cabinetDl}>
              <dt>Email</dt>
              <dd>{data.user.email}</dd>
              <dt>Имя</dt>
              <dd>{data.user.firstName || '—'}</dd>
              <dt>Фамилия</dt>
              <dd>{data.user.lastName || '—'}</dd>
              <dt>Телефон</dt>
              <dd>{data.user.phone || '—'}</dd>
              <dt>Роль</dt>
              <dd>{ROLE_LABELS[data.user.role as BackendRole] ?? data.user.role}</dd>
              <dt>Статус</dt>
              <dd>{data.user.isActive ? 'Активен' : 'Неактивен'}</dd>
            </dl>
          </section>
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Настройки уведомлений</h3>
            <p>
              Уведомлять при ответе в чате поддержки:{' '}
              {data.notificationSettings.notifyOnSupportChatReply ? 'Да' : 'Нет'}
            </p>
          </section>
          {data.notifications && data.notifications.length > 0 && (
            <section className={styles.cabinetSection}>
              <h3 className={styles.cabinetSectionTitle}>
                История уведомлений ({data.notifications.length})
              </h3>
              <p className={styles.cabinetHint}>
                История уведомлений доступна только для просмотра. Редактирование и удаление
                недоступны.
              </p>
              <div className={styles.cabinetNotifications}>
                {data.notifications.map((n) => (
                  <div key={n.id} className={styles.cabinetNotificationCard}>
                    <div className={styles.cabinetNotificationHeader}>
                      <span className={styles.cabinetNotificationTitle}>{n.title}</span>
                      <span className={styles.cabinetNotificationDate}>
                        {formatDate(n.createdAt)}
                      </span>
                    </div>
                    <div className={styles.cabinetNotificationMessage}>{n.message}</div>
                    {n.type && (
                      <span className={styles.cabinetNotificationType}>
                        {n.type === 'support_chat'
                          ? 'Чат поддержки'
                          : n.type === 'order_status'
                            ? 'Статус заказа'
                            : n.type === 'system'
                              ? 'Системное'
                              : n.type}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
          <section className={styles.cabinetSection}>
            <h3 className={styles.cabinetSectionTitle}>Заказы ({data.orders.length})</h3>
            {data.orders.length === 0 ? (
              <p className={styles.empty}>Заказов нет</p>
            ) : (
              <div className={styles.cabinetOrders}>
                {data.orders.map((order) => (
                  <div key={order.id} className={styles.cabinetOrderCard}>
                    <div className={styles.cabinetOrderHeader}>
                      <span className={styles.cabinetOrderNumber}>{order.orderNumber}</span>
                      <span className={styles.cabinetOrderDate}>{formatDate(order.createdAt)}</span>
                      <span className={styles.cabinetOrderStatus}>{order.status}</span>
                    </div>
                    <div className={styles.cabinetOrderTotal}>
                      Итого: {formatPrice(order.total)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}
    </Modal>
  );
}
