'use client';

import {
  ArrowLeftIcon,
  Bars3Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoonIcon,
  PencilSquareIcon,
  SunIcon,
} from '@heroicons/react/24/outline';

import { useCallback, useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { useAdminAccessibleResources } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/features/theme';
import { getAdminFormSubmissions } from '@/shared/api/admin-forms';
import type { AdminFormSubmission } from '@/shared/api/admin-forms';
import {
  type KnowledgePlatformFeedback,
  getKnowledgePlatformFeedback,
  markKnowledgePlatformFeedbackRead,
} from '@/shared/api/admin-knowledge';
import { getAdminNotificationsSettings } from '@/shared/api/admin-notifications';
import type { AdminNotificationsSettings } from '@/shared/api/admin-notifications';
import { getAdminOrders } from '@/shared/api/admin-orders';
import type { AdminOrderSummary } from '@/shared/api/admin-orders';
import { getAdminReviews } from '@/shared/api/admin-reviews';
import type { AdminReview } from '@/shared/api/admin-reviews';
import { getAdminSupportConversations } from '@/shared/api/admin-support';
import type { AdminSupportConversation } from '@/shared/api/admin-support';
import { ensureFreshAccessToken } from '@/shared/lib/auth-session';
import { getAvatarUrl } from '@/shared/lib/avatar';
import { canRoleEditCatalogOnPublicSite } from '@/shared/lib/catalog-public-edit';
import { useBrowserHistoryNavigation } from '@/shared/lib/hooks';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';
import {
  PUBLIC_SITE_EDIT_MODE_EVENT,
  getPublicSiteEditMode,
  setPublicSiteEditMode,
} from '@/shared/lib/public-site-edit-mode';
import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './AdminHeader.module.css';
import { AdminOnlineAvatars } from './AdminOnlineAvatars';

const ADMIN_NOTIFICATIONS_RESOURCE_ID = 'admin.settings.notifications';

const ROLE_NAMES: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  CONTENT_MANAGER: 'Контент-менеджер',
  TRAINEE: 'Стажёр',
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
  | { type: 'form'; id: string; date: string; link: string; text: string }
  | { type: 'knowledgeFeedback'; id: string; date: string; link: string; text: string };

function formatKnowledgeFeedbackAuthor(author: KnowledgePlatformFeedback['author']): string {
  if (!author) return 'сотрудника';
  const name = `${author.firstName ?? ''} ${author.lastName ?? ''}`.trim();
  return name || author.email;
}

const NOTIFICATIONS_DISMISSED_PREFIX = 'admin_notifications_dismissed';

function getDismissedNotificationsKey(userId: string) {
  return `${NOTIFICATIONS_DISMISSED_PREFIX}_${userId}`;
}

function loadDismissedNotificationIds(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(getDismissedNotificationsKey(userId));
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((value): value is string => typeof value === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function saveDismissedNotificationIds(userId: string, ids: Set<string>) {
  localStorage.setItem(getDismissedNotificationsKey(userId), JSON.stringify([...ids]));
}

function notificationItemKey(item: NotificationItem) {
  return `${item.type}:${item.id}`;
}

const NOTIFICATIONS_SETTINGS_HREF = '/admin/settings/notifications';

const FOOTER_LINKS: { href: string; label: string; superAdminOnly?: boolean }[] = [
  { href: '/admin/settings/reviews', label: 'Отзывы' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/support', label: 'Чат' },
  { href: '/admin/forms', label: 'Заявки' },
  { href: '/admin/knowledge/feedback', label: 'Обучение', superAdminOnly: true },
];

type AdminHeaderProps = {
  onMobileMenuOpen?: () => void;
};

export function AdminHeader({ onMobileMenuOpen }: AdminHeaderProps = {}) {
  const { user, logout } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useAdminAccessibleResources();
  const canLoadAdminNotifications = !accessLoading && hasAccess(ADMIN_NOTIFICATIONS_RESOURCE_ID);
  const { isDarkTheme, toggleTheme } = useTheme();
  const { canGoBack, canGoForward, goBack, goForward } = useBrowserHistoryNavigation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [reviewNotifications, setReviewNotifications] = useState<AdminReview[]>([]);
  const [orderNotifications, setOrderNotifications] = useState<AdminOrderSummary[]>([]);
  const [supportNotifications, setSupportNotifications] = useState<AdminSupportConversation[]>([]);
  const [formNotifications, setFormNotifications] = useState<AdminFormSubmission[]>([]);
  const [knowledgeFeedbackNotifications, setKnowledgeFeedbackNotifications] = useState<
    KnowledgePlatformFeedback[]
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<AdminNotificationsSettings | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const prevCountsRef = useRef<{
    reviews: number;
    orders: number;
    support: number;
    measurementForms: number;
    callbackForms: number;
    knowledgeFeedback: number;
  } | null>(null);

  const [publicSiteEditMode, setPublicSiteEditModeState] = useState(false);

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
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    try {
      await ensureFreshAccessToken();
      const [
        reviewsRes,
        ordersRes,
        supportRes,
        formsMeasurementRes,
        formsCallbackRes,
        feedbackRes,
      ] = await Promise.all([
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
        isSuperAdmin && notificationSettings?.notifyOnKnowledgeFeedback !== false
          ? getKnowledgePlatformFeedback({ unreadOnly: true, limit: 10 })
          : Promise.resolve({ items: [] as KnowledgePlatformFeedback[] }),
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
      const unreadKnowledgeFeedback = feedbackRes.items ?? [];

      const prev = prevCountsRef.current;
      prevCountsRef.current = {
        reviews: newReviews.length,
        orders: newOrders.length,
        support: activeSupport.length,
        measurementForms: measurementForms.length,
        callbackForms: callbackForms.length,
        knowledgeFeedback: unreadKnowledgeFeedback.length,
      };

      const settings = notificationSettings;
      const totalNew =
        newReviews.length +
        newOrders.length +
        activeSupport.length +
        measurementForms.length +
        callbackForms.length +
        unreadKnowledgeFeedback.length;
      const prevTotal = prev
        ? prev.reviews +
          prev.orders +
          prev.support +
          prev.measurementForms +
          prev.callbackForms +
          prev.knowledgeFeedback
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
        const latestKnowledgeFeedback = unreadKnowledgeFeedback[0];
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
        } else if (latestKnowledgeFeedback && settings.notifyOnKnowledgeFeedback) {
          const label =
            latestKnowledgeFeedback.type === 'BUG'
              ? 'Ошибка на обучающей платформе'
              : 'Предложение по обучающей платформе';
          new Notification(label, {
            body: `От ${formatKnowledgeFeedbackAuthor(latestKnowledgeFeedback.author)}`,
            tag: `knowledge-feedback-${latestKnowledgeFeedback.id}`,
          });
        }
      }

      setReviewNotifications(newReviews);
      setOrderNotifications(newOrders);
      setSupportNotifications(activeSupport);
      setFormNotifications(newForms);
      setKnowledgeFeedbackNotifications(unreadKnowledgeFeedback);
    } catch {
      setReviewNotifications([]);
      setOrderNotifications([]);
      setSupportNotifications([]);
      setFormNotifications([]);
      setKnowledgeFeedbackNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationSettings, user?.role]);

  useEffect(() => {
    if (!canLoadAdminNotifications) {
      setNotificationSettings(null);
      return;
    }
    loadNotificationSettings();
  }, [canLoadAdminNotifications, loadNotificationSettings]);

  useEffect(() => {
    if (user?.id) {
      setDismissedNotificationIds(loadDismissedNotificationIds(user.id));
    }
  }, [user?.id]);

  useEffect(() => {
    setPublicSiteEditModeState(getPublicSiteEditMode());
    const sync = () => setPublicSiteEditModeState(getPublicSiteEditMode());
    window.addEventListener('storage', sync);
    window.addEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener(PUBLIC_SITE_EDIT_MODE_EVENT, sync);
    };
  }, []);

  useEffect(() => {
    if (!notificationSettings) return;

    const intervalMs = (notificationSettings.checkIntervalSeconds ?? 60) * 1000;
    const run = () => {
      void loadAllNotifications();
    };

    run();
    const interval = setInterval(run, intervalMs);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- интервал только при смене настроек, не при каждом пересоздании loadAllNotifications
  }, [notificationSettings]);

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
    window.location.href = '/admin/login';
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
    ...knowledgeFeedbackNotifications.map((f) => ({
      type: 'knowledgeFeedback' as const,
      id: f.id,
      date: f.createdAt,
      link: `/admin/knowledge/feedback`,
      text:
        f.type === 'BUG'
          ? `Ошибка на платформе от ${formatKnowledgeFeedbackAuthor(f.author)}`
          : `Предложение по платформе от ${formatKnowledgeFeedbackAuthor(f.author)}`,
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const visibleNotificationItems = notificationItems.filter(
    (item) => !dismissedNotificationIds.has(notificationItemKey(item))
  );
  const hasDismissedNotifications =
    notificationItems.length > 0 && visibleNotificationItems.length < notificationItems.length;

  const unreadCount = visibleNotificationItems.length;
  const canTogglePublicSiteEdit = canRoleEditCatalogOnPublicSite(user?.role);

  const dismissNotification = useCallback(
    (item: NotificationItem) => {
      if (!user?.id) return;
      const key = notificationItemKey(item);
      setDismissedNotificationIds((prev) => {
        if (prev.has(key)) return prev;
        const next = new Set(prev);
        next.add(key);
        saveDismissedNotificationIds(user.id, next);
        return next;
      });
      if (item.type === 'knowledgeFeedback') {
        setKnowledgeFeedbackNotifications((prev) => prev.filter((f) => f.id !== item.id));
      }
    },
    [user?.id]
  );

  const handleMarkAllNotificationsRead = async () => {
    if (!user?.id) return;
    const next = new Set(dismissedNotificationIds);
    for (const item of notificationItems) {
      next.add(notificationItemKey(item));
    }
    saveDismissedNotificationIds(user.id, next);
    setDismissedNotificationIds(next);
    if (user.role === 'SUPER_ADMIN' && knowledgeFeedbackNotifications.length > 0) {
      try {
        await markKnowledgePlatformFeedbackRead();
        setKnowledgeFeedbackNotifications([]);
      } catch {
        /* ignore */
      }
    }
  };

  const handleDismissNotification = (item: NotificationItem) => {
    dismissNotification(item);
  };

  const handleNotificationClick = (item: NotificationItem) => {
    dismissNotification(item);
    setShowNotifications(false);
  };

  const togglePublicSiteEditMode = () => {
    const next = !getPublicSiteEditMode();
    setPublicSiteEditMode(next);
    setPublicSiteEditModeState(next);
  };

  return (
    <header className={styles.header}>
      <div className={styles.headerStart}>
        {onMobileMenuOpen ? (
          <button
            type="button"
            className={styles.mobileMenuButton}
            onClick={onMobileMenuOpen}
            title="Открыть меню"
            aria-label="Открыть меню навигации"
          >
            <Bars3Icon className={styles.mobileMenuIcon} aria-hidden />
          </button>
        ) : null}
        <Link
          href={getSafeHref('/', '/')}
          className={styles.backToPublicLink}
          title="Вернуться на публичный сайт"
          aria-label="Вернуться на публичный сайт"
        >
          <ArrowLeftIcon className={styles.backToPublicIcon} aria-hidden />
          <span className={styles.backToPublicText}>На сайт</span>
        </Link>
        <div className={styles.historyNav} role="group" aria-label="Навигация по истории">
          <button
            type="button"
            className={styles.historyNavButton}
            onClick={goBack}
            disabled={!canGoBack}
            title="Назад"
            aria-label="Назад"
          >
            <ChevronLeftIcon className={styles.historyNavIcon} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.historyNavButton}
            onClick={goForward}
            disabled={!canGoForward}
            title="Вперёд"
            aria-label="Вперёд"
          >
            <ChevronRightIcon className={styles.historyNavIcon} aria-hidden />
          </button>
        </div>
      </div>
      <div className={styles.searchWrapper}>
        <input
          type="search"
          placeholder="Поиск по админ-панели..."
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className={styles.actions}>
        <AdminOnlineAvatars />
        {canTogglePublicSiteEdit && (
          <button
            type="button"
            className={
              publicSiteEditMode
                ? `${styles.publicSiteEditToggle} ${styles.publicSiteEditToggleActive}`
                : styles.publicSiteEditToggle
            }
            onClick={togglePublicSiteEditMode}
            title={
              publicSiteEditMode
                ? 'Выключить редактирование публичного сайта'
                : 'Включить режим: правки характеристик товаров на публичном сайте'
            }
          >
            <PencilSquareIcon className={styles.publicSiteEditIcon} aria-hidden />
            <span className={styles.publicSiteEditLabel}>
              {publicSiteEditMode ? 'Редактирование сайта: вкл' : 'Редактировать публичный сайт'}
            </span>
          </button>
        )}
        <button
          type="button"
          className={styles.iconButton}
          onClick={toggleTheme}
          title={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
          aria-label={isDarkTheme ? 'Светлая тема' : 'Тёмная тема'}
        >
          {isDarkTheme ? (
            <SunIcon className={styles.themeIcon} />
          ) : (
            <MoonIcon className={styles.themeIcon} />
          )}
        </button>

        {canLoadAdminNotifications ? (
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
              <div className={`${styles.dropdown} ${styles.notificationsDropdown}`}>
                <div className={styles.dropdownHeader}>
                  <span>Уведомления</span>
                  <div className={styles.dropdownHeaderActions}>
                    <Link
                      href={getSafeHref(NOTIFICATIONS_SETTINGS_HREF, '#')}
                      className={styles.notificationSettingsLink}
                      onClick={() => setShowNotifications(false)}
                    >
                      Настройки
                    </Link>
                    {visibleNotificationItems.length > 0 ? (
                      <button
                        type="button"
                        className={styles.markAllRead}
                        onClick={() => void handleMarkAllNotificationsRead()}
                      >
                        Прочитать все
                      </button>
                    ) : null}
                  </div>
                </div>
                <div className={styles.notificationList}>
                  {notificationsLoading ? (
                    <div className={styles.notificationItem}>
                      <p className={styles.notificationText}>Загрузка...</p>
                    </div>
                  ) : visibleNotificationItems.length === 0 ? (
                    <div className={styles.notificationItem}>
                      <p className={styles.notificationText}>
                        {hasDismissedNotifications
                          ? 'Все уведомления прочитаны'
                          : 'Нет новых уведомлений'}
                      </p>
                      {notificationItems.length > 0 && !hasDismissedNotifications ? (
                        <span className={styles.notificationHint}>
                          Нажмите «Прочитать все» или ✓ у каждого пункта, чтобы скрыть события
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    visibleNotificationItems.map((item) => (
                      <div
                        key={`${item.type}-${item.id}`}
                        className={`${styles.notificationRow} ${styles.unread}`}
                      >
                        <Link
                          href={getSafeHref(item.link, '#')}
                          className={styles.notificationItem}
                          onClick={() => handleNotificationClick(item)}
                        >
                          <p className={styles.notificationText}>{item.text}</p>
                          <span className={styles.notificationTime}>
                            {formatTimeAgo(item.date)}
                          </span>
                        </Link>
                        <button
                          type="button"
                          className={styles.dismissNotification}
                          title="Отметить прочитанным"
                          aria-label="Отметить прочитанным"
                          onClick={() => handleDismissNotification(item)}
                        >
                          <CheckIcon className={styles.dismissNotificationIcon} aria-hidden />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className={styles.dropdownFooter}>
                  <Link
                    href={getSafeHref(NOTIFICATIONS_SETTINGS_HREF, '#')}
                    className={styles.notificationSettingsButton}
                    onClick={() => setShowNotifications(false)}
                  >
                    Настройки уведомлений и push
                  </Link>
                  <div className={styles.footerChips}>
                    {FOOTER_LINKS.filter(
                      (link) => !link.superAdminOnly || user?.role === 'SUPER_ADMIN'
                    ).map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={styles.footerChip}
                        onClick={() => setShowNotifications(false)}
                      >
                        {link.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : null}

        <div className={styles.userWrapper} ref={userMenuRef}>
          <button className={styles.userButton} onClick={() => setShowUserMenu(!showUserMenu)}>
            {user?.avatar ? (
              <img
                src={getAvatarUrl(user.avatar) ?? user.avatar}
                alt=""
                className={styles.avatarImg}
              />
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
