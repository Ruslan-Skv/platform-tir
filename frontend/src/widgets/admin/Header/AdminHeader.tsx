'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';
import { getAdminFormSubmissions } from '@/shared/api/admin-forms';
import type { AdminFormSubmission } from '@/shared/api/admin-forms';
import { getAdminNotificationsSettings } from '@/shared/api/admin-notifications';
import type { AdminNotificationsSettings } from '@/shared/api/admin-notifications';
import { getAdminOrders } from '@/shared/api/admin-orders';
import type { AdminOrderSummary } from '@/shared/api/admin-orders';
import { getAdminReviews } from '@/shared/api/admin-reviews';
import type { AdminReview } from '@/shared/api/admin-reviews';
import { getAdminSupportConversations } from '@/shared/api/admin-support';
import type { AdminSupportConversation } from '@/shared/api/admin-support';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';

import styles from './AdminHeader.module.css';

const ROLE_NAMES: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  CONTENT_MANAGER: 'Контент-менеджер',
};

function formatTimeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'только что';
  if (diffMins < 60) return `${diffMins} мин назад`;
  if (diffHours < 24) return `${diffHours} ч назад`;
  if (diffDays < 7) return `${diffDays} дн назад`;
  return date.toLocaleDateString('ru-RU');
}

type NotificationItem =
  | { type: 'review'; id: string; date: string; link: string; text: string }
  | { type: 'order'; id: string; date: string; link: string; text: string }
  | { type: 'support'; id: string; date: string; link: string; text: string }
  | { type: 'form'; id: string; date: string; link: string; text: string };

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [reviewNotifications, setReviewNotifications] = useState<AdminReview[]>([]);
  const [orderNotifications, setOrderNotifications] = useState<AdminOrderSummary[]>([]);
  const [supportNotifications, setSupportNotifications] = useState<AdminSupportConversation[]>([]);
  const [formNotifications, setFormNotifications] = useState<AdminFormSubmission[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<AdminNotificationsSettings | null>(null);
  const prevCountsRef = useRef<{
    reviews: number;
    orders: number;
    support: number;
    measurementForms: number;
    callbackForms: number;
  } | null>(null);

  const notificationRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const loadNotificationSettings = useCallback(async () => {
    try {
      const settings = await getAdminNotificationsSettings();
      setNotificationSettings(settings);
    } catch {
      setNotificationSettings(null);
    }
  }, []);

  const loadAllNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const [reviewsRes, ordersRes, supportRes, formsMeasurementRes, formsCallbackRes] =
        await Promise.all([
          notificationSettings?.notifyOnReviews !== false
            ? getAdminReviews(1, 10, undefined, false)
            : Promise.resolve({ data: [] as AdminReview[] }),
          notificationSettings?.notifyOnOrders !== false
            ? getAdminOrders(1, 10, 'PENDING')
            : Promise.resolve({ data: [] as AdminOrderSummary[] }),
          notificationSettings?.notifyOnSupportChat !== false
            ? getAdminSupportConversations()
            : Promise.resolve([] as AdminSupportConversation[]),
          notificationSettings?.notifyOnMeasurementForm !== false
            ? getAdminFormSubmissions(1, 10, 'measurement')
            : Promise.resolve({ data: [] as AdminFormSubmission[] }),
          notificationSettings?.notifyOnCallbackForm !== false
            ? getAdminFormSubmissions(1, 10, 'callback')
            : Promise.resolve({ data: [] as AdminFormSubmission[] }),
        ]);

      const newReviews = reviewsRes.data ?? [];
      const newOrders = ordersRes.data ?? [];
      const supportConvs = Array.isArray(supportRes) ? supportRes : [];
      const activeSupport = supportConvs.filter(
        (c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'
      );
      const measurementForms = (formsMeasurementRes?.data ?? []) as AdminFormSubmission[];
      const callbackForms = (formsCallbackRes?.data ?? []) as AdminFormSubmission[];
      const newForms = [...measurementForms, ...callbackForms].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      const prev = prevCountsRef.current;
      prevCountsRef.current = {
        reviews: newReviews.length,
        orders: newOrders.length,
        support: activeSupport.length,
        measurementForms: measurementForms.length,
        callbackForms: callbackForms.length,
      };

      const settings = notificationSettings;
      const totalNew =
        newReviews.length +
        newOrders.length +
        activeSupport.length +
        measurementForms.length +
        callbackForms.length;
      const prevTotal = prev
        ? prev.reviews + prev.orders + prev.support + prev.measurementForms + prev.callbackForms
        : totalNew;

      if (prev !== null && totalNew > prevTotal && settings?.soundEnabled) {
        playNotificationSound(
          settings.soundVolume ?? 70,
          (settings.soundType as NotificationSoundType) ?? 'beep',
          settings.customSoundUrl
        );
      }

      if (
        prev !== null &&
        totalNew > prevTotal &&
        settings?.desktopNotifications &&
        'Notification' in window &&
        Notification.permission === 'granted'
      ) {
        const latestReview = newReviews[0];
        const latestOrder = newOrders[0];
        const latestSupport = activeSupport[0];
        const latestForm = newForms[0];
        if (latestReview && settings.notifyOnReviews) {
          new Notification('Новый отзыв', {
            body: `«${latestReview.product?.name || 'Товар'}» от ${latestReview.userName}`,
            tag: `review-${latestReview.id}`,
          });
        } else if (latestOrder && settings.notifyOnOrders) {
          const customer =
            latestOrder.user?.firstName || latestOrder.user?.lastName
              ? `${latestOrder.user.firstName || ''} ${latestOrder.user.lastName || ''}`.trim()
              : latestOrder.user?.email || 'Клиент';
          new Notification('Новый заказ', {
            body: `${latestOrder.orderNumber} от ${customer}`,
            tag: `order-${latestOrder.id}`,
          });
        } else if (latestSupport && settings.notifyOnSupportChat) {
          const userName =
            latestSupport.user?.firstName || latestSupport.user?.lastName
              ? `${latestSupport.user.firstName || ''} ${latestSupport.user.lastName || ''}`.trim()
              : latestSupport.user?.email || 'Клиент';
          new Notification('Сообщение в чате', {
            body: `Диалог с ${userName}`,
            tag: `support-${latestSupport.id}`,
          });
        } else if (
          latestForm &&
          ((latestForm.type === 'measurement' && settings.notifyOnMeasurementForm) ||
            (latestForm.type === 'callback' && settings.notifyOnCallbackForm))
        ) {
          const formLabel =
            latestForm.type === 'measurement' ? 'Запись на замер' : 'Обратный звонок';
          new Notification(formLabel, {
            body: `${latestForm.name}, ${latestForm.phone}`,
            tag: `form-${latestForm.id}`,
          });
        }
      }

      setReviewNotifications(newReviews);
      setOrderNotifications(newOrders);
      setSupportNotifications(activeSupport);
      setFormNotifications(newForms);
    } catch {
      setReviewNotifications([]);
      setOrderNotifications([]);
      setSupportNotifications([]);
      setFormNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationSettings]);

  useEffect(() => {
    loadNotificationSettings();
  }, [loadNotificationSettings]);

  useEffect(() => {
    if (!notificationSettings) return;
    loadAllNotifications();
    const intervalMs = (notificationSettings.checkIntervalSeconds ?? 60) * 1000;
    const interval = setInterval(loadAllNotifications, intervalMs);
    return () => clearInterval(interval);
  }, [loadAllNotifications, notificationSettings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'Пользователь';

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const notificationItems: NotificationItem[] = [
    ...reviewNotifications.map((r) => ({
      type: 'review' as const,
      id: r.id,
      date: r.createdAt,
      link: `/admin/catalog/products/${r.productId}/edit`,
      text: `Новый отзыв на «${r.product?.name || 'Товар'}» от ${r.userName}`,
    })),
    ...orderNotifications.map((o) => ({
      type: 'order' as const,
      id: o.id,
      date: o.createdAt,
      link: `/admin/orders?status=PENDING`,
      text: `Новый заказ ${o.orderNumber} от ${
        o.user?.firstName || o.user?.lastName
          ? `${o.user.firstName || ''} ${o.user.lastName || ''}`.trim()
          : o.user?.email || 'клиента'
      }`,
    })),
    ...supportNotifications.map((s) => ({
      type: 'support' as const,
      id: s.id,
      date: s.updatedAt,
      link: `/admin/support`,
      text: `Сообщение в чате от ${
        s.user?.firstName || s.user?.lastName
          ? `${s.user.firstName || ''} ${s.user.lastName || ''}`.trim()
          : s.user?.email || 'клиента'
      }`,
    })),
    ...formNotifications.map((f) => ({
      type: 'form' as const,
      id: f.id,
      date: f.createdAt,
      link: `/admin/forms`,
      text:
        f.type === 'measurement' ? `Запись на замер от ${f.name}` : `Обратный звонок от ${f.name}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const unreadCount = notificationItems.length;

  return (
    <header className={styles.header}>
      <div className={styles.searchWrapper}>
        <input
          type="search"
          placeholder="Поиск по админ-панели..."
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className={styles.actions}>
        <div className={styles.notificationWrapper} ref={notificationRef}>
          <button
            className={styles.iconButton}
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (!showNotifications) loadAllNotifications();
            }}
          >
            🔔
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span>Уведомления</span>
              </div>
              <div className={styles.notificationList}>
                {notificationsLoading ? (
                  <div className={styles.notificationItem}>
                    <p className={styles.notificationText}>Загрузка...</p>
                  </div>
                ) : notificationItems.length === 0 ? (
                  <div className={styles.notificationItem}>
                    <p className={styles.notificationText}>Нет новых уведомлений</p>
                  </div>
                ) : (
                  notificationItems.map((item) => (
                    <Link
                      key={`${item.type}-${item.id}`}
                      href={item.link}
                      className={`${styles.notificationItem} ${styles.unread}`}
                      onClick={() => setShowNotifications(false)}
                    >
                      <p className={styles.notificationText}>{item.text}</p>
                      <span className={styles.notificationTime}>{formatTimeAgo(item.date)}</span>
                    </Link>
                  ))
                )}
              </div>
              <div className={styles.dropdownFooter}>
                <Link href="/admin/settings/reviews">Отзывы</Link>
                <span className={styles.dropdownFooterSep}>·</span>
                <Link href="/admin/orders">Заказы</Link>
                <span className={styles.dropdownFooterSep}>·</span>
                <Link href="/admin/support">Чат поддержки</Link>
                <span className={styles.dropdownFooterSep}>·</span>
                <Link href="/admin/forms">Заявки с форм</Link>
              </div>
            </div>
          )}
        </div>

        <div className={styles.userWrapper} ref={userMenuRef}>
          <button className={styles.userButton} onClick={() => setShowUserMenu(!showUserMenu)}>
            {user?.avatar ? (
              <img src={user.avatar} alt="" className={styles.avatarImg} />
            ) : (
              <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
            )}
            <div className={styles.userInfo}>
              <span className={styles.userName}>{displayName}</span>
              <span className={styles.userRole}>
                {user?.role ? ROLE_NAMES[user.role] || user.role : ''}
              </span>
            </div>
            <span className={styles.userArrow}>▼</span>
          </button>

          {showUserMenu && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownUserInfo}>
                <strong>{displayName}</strong>
                <span>{user?.email}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <a href="/admin/profile" className={styles.dropdownItem}>
                👤 Профиль
              </a>
              <a href="/admin/settings" className={styles.dropdownItem}>
                ⚙️ Настройки
              </a>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                🚪 Выйти
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
