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
import { markKnowledgePlatformFeedbackRead } from '@/shared/api/admin-knowledge';
import { getAdminLeads, updateAdminLead } from '@/shared/api/admin-leads';
import type { UnifiedLeadItem } from '@/shared/api/admin-leads';
import {
  getAdminBellTrainingNotifications,
  getAdminNotificationsSettings,
} from '@/shared/api/admin-notifications';
import type {
  AdminBellTrainingNotification,
  AdminNotificationsSettings,
} from '@/shared/api/admin-notifications';
import { getAdminReviews } from '@/shared/api/admin-reviews';
import type { AdminReview } from '@/shared/api/admin-reviews';
import { markSitePlatformFeedbackRead } from '@/shared/api/admin-site-feedback';
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
import {
  addDismissedNotificationKeys,
  notificationItemKey,
  syncDismissedNotificationIds,
} from './admin-bell-dismissed.storage';
import {
  type AdminBellNotificationItem,
  buildDesktopNotification,
  filterNotifiableLeads,
  isBellTypeEnabled,
  isNotificationItemEnabled,
  leadsToBellNotificationItems,
  reviewToBellNotificationItem,
  supportToBellNotificationItem,
  trainingToBellNotificationItem,
} from './admin-header-notifications.utils';

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

type NotificationItem = AdminBellNotificationItem;

const FOOTER_LINKS: { href: string; label: string; superAdminOnly?: boolean }[] = [
  { href: '/admin/settings/reviews', label: 'Отзывы' },
  { href: '/admin/orders', label: 'Заказы' },
  { href: '/admin/support', label: 'Чат' },
  { href: '/admin/leads', label: 'Заявки' },
  { href: '/admin/knowledge/analytics', label: 'Динамика обучения' },
  { href: '/admin/knowledge/feedback', label: 'Обучение', superAdminOnly: true },
  { href: '/admin/content/site-feedback', label: 'Сайт', superAdminOnly: true },
];

const NOTIFICATIONS_SETTINGS_HREF = '/admin/settings/notifications';

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
  const [supportNotifications, setSupportNotifications] = useState<AdminSupportConversation[]>([]);
  const [leadNotifications, setLeadNotifications] = useState<UnifiedLeadItem[]>([]);
  const [trainingNotifications, setTrainingNotifications] = useState<
    AdminBellTrainingNotification[]
  >([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationSettings, setNotificationSettings] =
    useState<AdminNotificationsSettings | null>(null);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<Set<string>>(
    () => new Set()
  );
  const prevCountsRef = useRef<{
    reviews: number;
    support: number;
    leads: number;
    training: number;
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
    try {
      await ensureFreshAccessToken();
      const settings = notificationSettings;

      const loadTraining =
        settings?.notifyOnKnowledgeTraining !== false && hasAccess('admin.knowledge')
          ? getAdminBellTrainingNotifications(20)
          : Promise.resolve([] as AdminBellTrainingNotification[]);

      const [reviewsRes, supportRes, leadsRes, trainingRes] = await Promise.all([
        settings?.notifyOnReviews !== false
          ? getAdminReviews(1, 10, undefined, false)
          : Promise.resolve({ data: [] as AdminReview[] }),
        settings?.notifyOnSupportChat !== false
          ? getAdminSupportConversations()
          : Promise.resolve([] as AdminSupportConversation[]),
        getAdminLeads({ page: 1, limit: 30, status: 'new' }),
        loadTraining,
      ]);

      const newReviews = reviewsRes.data ?? [];
      const supportConvs = Array.isArray(supportRes) ? supportRes : [];
      const activeSupport = supportConvs.filter(
        (c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'
      );
      const newLeads = filterNotifiableLeads(leadsRes.data ?? [], settings, hasAccess);
      const newTraining = trainingRes ?? [];

      const prev = prevCountsRef.current;
      prevCountsRef.current = {
        reviews: newReviews.length,
        support: activeSupport.length,
        leads: newLeads.length,
        training: newTraining.length,
      };

      const totalNew =
        newReviews.length + activeSupport.length + newLeads.length + newTraining.length;
      const prevTotal = prev ? prev.reviews + prev.support + prev.leads + prev.training : totalNew;

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
        const latestItem = [
          ...newReviews.map(reviewToBellNotificationItem),
          ...activeSupport.map(supportToBellNotificationItem),
          ...leadsToBellNotificationItems(newLeads),
          ...newTraining.map(trainingToBellNotificationItem),
        ]
          .filter((item) => isBellTypeEnabled(item.type, settings))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        if (latestItem) {
          const { title, body, tag } = buildDesktopNotification(latestItem);
          new Notification(title, { body, tag });
        }
      }

      setReviewNotifications(newReviews);
      setSupportNotifications(activeSupport);
      setLeadNotifications(newLeads);
      setTrainingNotifications(newTraining);
    } catch {
      setReviewNotifications([]);
      setSupportNotifications([]);
      setLeadNotifications([]);
      setTrainingNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [notificationSettings, hasAccess]);

  useEffect(() => {
    if (!canLoadAdminNotifications) {
      setNotificationSettings(null);
      return;
    }
    loadNotificationSettings();
  }, [canLoadAdminNotifications, loadNotificationSettings]);

  useEffect(() => {
    if (!user?.id) {
      setDismissedNotificationIds(new Set());
      return;
    }
    let cancelled = false;
    void syncDismissedNotificationIds(user.id).then((ids) => {
      if (!cancelled) setDismissedNotificationIds(ids);
    });
    return () => {
      cancelled = true;
    };
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

    const startDelay = window.setTimeout(run, 2_000);
    const interval = window.setInterval(run, intervalMs);
    return () => {
      window.clearTimeout(startDelay);
      window.clearInterval(interval);
    };
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
    ...reviewNotifications.map(reviewToBellNotificationItem),
    ...supportNotifications.map(supportToBellNotificationItem),
    ...leadsToBellNotificationItems(leadNotifications),
    ...trainingNotifications.map(trainingToBellNotificationItem),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const enabledNotificationItems = notificationItems.filter((item) =>
    isNotificationItemEnabled(item, notificationSettings, hasAccess, user?.role)
  );

  const visibleNotificationItems = enabledNotificationItems.filter(
    (item) => !dismissedNotificationIds.has(notificationItemKey(item.type, item.id))
  );
  const hasDismissedNotifications =
    enabledNotificationItems.length > 0 &&
    visibleNotificationItems.length < enabledNotificationItems.length;

  const unreadCount = visibleNotificationItems.length;
  const canTogglePublicSiteEdit = canRoleEditCatalogOnPublicSite(user?.role);

  const dismissNotification = useCallback(
    (item: NotificationItem) => {
      if (!user?.id) return;
      const key = notificationItemKey(item.type, item.id);
      setDismissedNotificationIds((prev) => {
        if (prev.has(key)) return prev;
        void addDismissedNotificationKeys(user.id, prev, [key]).then(setDismissedNotificationIds);
        const optimistic = new Set(prev);
        optimistic.add(key);
        return optimistic;
      });
      if (item.type === 'knowledgeFeedback' || item.type === 'siteFeedback') {
        setLeadNotifications((prev) => prev.filter((lead) => lead.id !== item.id));
        void updateAdminLead(item.id, { status: 'completed' }).catch(() => undefined);
      }
    },
    [user?.id]
  );

  const handleMarkAllNotificationsRead = async () => {
    if (!user?.id) return;
    const keys = enabledNotificationItems.map((item) => notificationItemKey(item.type, item.id));
    const next = await addDismissedNotificationKeys(user.id, dismissedNotificationIds, keys);
    setDismissedNotificationIds(next);

    const hasKnowledgeFeedback = leadNotifications.some(
      (lead) => lead.source === 'knowledge_feedback'
    );
    const hasSiteFeedback = leadNotifications.some((lead) => lead.source === 'site_feedback');

    if (user.role === 'SUPER_ADMIN' && hasKnowledgeFeedback) {
      try {
        await markKnowledgePlatformFeedbackRead();
      } catch {
        /* ignore */
      }
    }
    if (user.role === 'SUPER_ADMIN' && hasSiteFeedback) {
      try {
        await markSitePlatformFeedbackRead();
      } catch {
        /* ignore */
      }
    }
    setLeadNotifications((prev) =>
      prev.filter((lead) => lead.source !== 'knowledge_feedback' && lead.source !== 'site_feedback')
    );
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
                      {enabledNotificationItems.length > 0 && !hasDismissedNotifications ? (
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
