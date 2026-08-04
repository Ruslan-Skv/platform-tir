'use client';

import {
  Bars3Icon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MoonIcon,
  PencilSquareIcon,
  SunIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';

import { useAdminAccessibleResources } from '@/features/admin/contexts/AdminAccessibleResourcesContext';
import { AdminProfileModal } from '@/features/admin/profile';
import { WorkDayWidget } from '@/features/admin/work-day';
import { useAuth } from '@/features/auth';
import { useTheme } from '@/features/theme';
import { markKnowledgePlatformFeedbackRead } from '@/shared/api/admin-knowledge';
import { getAdminDirectorMessages, getAdminLeads, updateAdminLead } from '@/shared/api/admin-leads';
import type { UnifiedLeadItem } from '@/shared/api/admin-leads';
import {
  getAdminBellInstallationScheduleNotifications,
  getAdminBellRepairScheduleNotifications,
  getAdminBellTrainingNotifications,
  getAdminBellWaybillNotifications,
  getAdminBellWorkDayNotifications,
  getAdminNotificationsSettings,
} from '@/shared/api/admin-notifications';
import type {
  AdminBellInstallationScheduleNotification,
  AdminBellRepairScheduleNotification,
  AdminBellTrainingNotification,
  AdminBellWaybillNotification,
  AdminBellWorkDayNotification,
  AdminNotificationsSettings,
} from '@/shared/api/admin-notifications';
import { getAdminReviews } from '@/shared/api/admin-reviews';
import type { AdminReview } from '@/shared/api/admin-reviews';
import { markSitePlatformFeedbackRead } from '@/shared/api/admin-site-feedback';
import { getAdminSupportConversations } from '@/shared/api/admin-support';
import type { AdminSupportConversation } from '@/shared/api/admin-support';
import { canUseAdminNotificationBell, getRoleLabel } from '@/shared/config/admin-roles';
import {
  PUBLIC_SITE_EDIT_MODE_EVENT,
  canRoleEditCatalogOnPublicSite,
  getPublicSiteEditMode,
  setPublicSiteEditMode,
} from '@/shared/lib/admin';
import { ensureFreshAccessToken } from '@/shared/lib/auth-session';
import { getAvatarUrl } from '@/shared/lib/avatar';
import { canRunBackgroundNetwork, whenOnlineSettled } from '@/shared/lib/browser-network';
import { useBrowserHistoryNavigation, useFaviconBadge } from '@/shared/lib/hooks';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';
import { getSafeHref } from '@/shared/lib/sanitize';
import { Logo } from '@/shared/ui/Logo';
import { NotificationBellIcon } from '@/shared/ui/icons/NotificationBellIcon';
import { ProfileMenuIcon } from '@/shared/ui/icons/ProfileMenuIcon';
import { ProfileUserSquareIcon } from '@/shared/ui/icons/ProfileUserSquareIcon';

import styles from './AdminHeader.module.css';
import { AdminMyNotificationsModal } from './AdminMyNotificationsModal';
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
  installationScheduleToBellNotificationItem,
  isBellTypeEnabled,
  isNotificationItemEnabled,
  leadsToBellNotificationItems,
  repairScheduleToBellNotificationItem,
  reviewToBellNotificationItem,
  supportToBellNotificationItem,
  trainingToBellNotificationItem,
  waybillToBellNotificationItem,
  workDayToBellNotificationItem,
} from './admin-header-notifications.utils';

const ADMIN_NOTIFICATIONS_RESOURCE_ID = 'admin.settings.notifications';

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
  { href: '/admin/knowledge/analytics', label: 'Динамика обучения', superAdminOnly: true },
  { href: '/admin/crm/work-days', label: 'Рабочее время', superAdminOnly: true },
  { href: '/admin/knowledge/feedback', label: 'Обучение', superAdminOnly: true },
  { href: '/admin/content/site-feedback', label: 'Сайт', superAdminOnly: true },
];

const NOTIFICATIONS_SETTINGS_HREF = '/admin/settings/notifications';

type AdminHeaderProps = {
  onMobileMenuOpen?: () => void;
  mobileMenuOpen?: boolean;
};

export function AdminHeader({ onMobileMenuOpen, mobileMenuOpen = false }: AdminHeaderProps = {}) {
  const { user, logout, isLoading: authLoading } = useAuth();
  const { hasAccess, isLoading: accessLoading } = useAdminAccessibleResources();
  const canLoadAdminNotifications = !authLoading && canUseAdminNotificationBell(user?.role);
  const canOpenNotificationSettings = !accessLoading && hasAccess(ADMIN_NOTIFICATIONS_RESOURCE_ID);
  const { isDarkTheme, toggleTheme } = useTheme();
  const { canGoBack, canGoForward, goBack, goForward } = useBrowserHistoryNavigation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMyNotificationsModal, setShowMyNotificationsModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [reviewNotifications, setReviewNotifications] = useState<AdminReview[]>([]);
  const [supportNotifications, setSupportNotifications] = useState<AdminSupportConversation[]>([]);
  const [leadNotifications, setLeadNotifications] = useState<UnifiedLeadItem[]>([]);
  const [trainingNotifications, setTrainingNotifications] = useState<
    AdminBellTrainingNotification[]
  >([]);
  const [workDayNotifications, setWorkDayNotifications] = useState<AdminBellWorkDayNotification[]>(
    []
  );
  const [waybillNotifications, setWaybillNotifications] = useState<AdminBellWaybillNotification[]>(
    []
  );
  const [installationScheduleNotifications, setInstallationScheduleNotifications] = useState<
    AdminBellInstallationScheduleNotification[]
  >([]);
  const [repairScheduleNotifications, setRepairScheduleNotifications] = useState<
    AdminBellRepairScheduleNotification[]
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
    workDays: number;
    waybills: number;
    installationSchedules: number;
    repairSchedules: number;
  } | null>(null);

  const [publicSiteEditMode, setPublicSiteEditModeState] = useState(false);

  const notificationRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const headerRevealStartedAt = useRef(0);
  const [notificationsPanelBox, setNotificationsPanelBox] = useState<{
    top: number;
    left: number;
    width: number;
    mobile: boolean;
  } | null>(null);
  const [notificationsPanelRendered, setNotificationsPanelRendered] = useState(false);
  const [notificationsPanelOpen, setNotificationsPanelOpen] = useState(false);

  useLayoutEffect(() => {
    const root = headerRef.current;
    if (!root) return;

    const STAGGER_MS = 150;
    if (!headerRevealStartedAt.current) {
      headerRevealStartedAt.current = performance.now();
    }

    const syncRevealOrder = () => {
      const revealSelector = `.${styles.headerReveal}`;
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        root.querySelectorAll<HTMLElement>(revealSelector).forEach((node) => {
          node.classList.add(styles.headerRevealPlay);
          node.classList.add(styles.headerRevealDone);
          node.style.setProperty('--header-reveal-delay', '0ms');
        });
        return;
      }

      const nodes = [...root.querySelectorAll<HTMLElement>(revealSelector)].filter((node) => {
        if (window.getComputedStyle(node).display === 'none') return false;
        const rect = node.getBoundingClientRect();
        return rect.width > 0 || rect.height > 0;
      });

      const elapsed = performance.now() - headerRevealStartedAt.current;
      nodes.forEach((node, index) => {
        if (node.dataset.revealStarted === '1') {
          // React перезаписывает className и может снять headerRevealPlay → opacity: 0
          if (
            !node.classList.contains(styles.headerRevealPlay) &&
            !node.classList.contains(styles.headerRevealDone)
          ) {
            node.classList.add(styles.headerRevealDone);
          }
          return;
        }
        node.dataset.revealStarted = '1';
        const delay = Math.max(0, index * STAGGER_MS - elapsed);
        node.style.setProperty('--header-reveal-delay', `${delay}ms`);
        node.classList.add(styles.headerRevealPlay);
        const onAnimEnd = (event: AnimationEvent) => {
          if (event.target !== node) return;
          node.classList.add(styles.headerRevealDone);
        };
        node.addEventListener('animationend', onAnimEnd, { once: true });
      });
    };

    syncRevealOrder();
    const observer = new MutationObserver(syncRevealOrder);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const syncHeaderHeight = () => {
      document.documentElement.style.setProperty(
        '--admin-header-height',
        `${el.getBoundingClientRect().height}px`
      );
    };

    syncHeaderHeight();
    const observer = new ResizeObserver(syncHeaderHeight);
    observer.observe(el);
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--admin-header-height');
    };
  }, []);

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

      const loadWorkDays =
        settings?.notifyOnWorkDays !== false && hasAccess('admin.crm.work-days')
          ? getAdminBellWorkDayNotifications(20)
          : Promise.resolve([] as AdminBellWorkDayNotification[]);

      const canAccessWaybills =
        hasAccess('admin.crm.waybills') || hasAccess('admin.crm.waybills.my');
      const loadWaybills =
        settings?.notifyOnWaybills !== false && canAccessWaybills
          ? getAdminBellWaybillNotifications(20)
          : Promise.resolve([] as AdminBellWaybillNotification[]);
      const loadInstallationSchedules =
        settings?.notifyOnInstallationSchedules !== false &&
        (hasAccess('admin.crm.installation-schedules') ||
          hasAccess('admin.crm.installation-schedules.my'))
          ? getAdminBellInstallationScheduleNotifications(20)
          : Promise.resolve([] as AdminBellInstallationScheduleNotification[]);
      const loadRepairSchedules =
        settings?.notifyOnRepairSchedules !== false &&
        (hasAccess('admin.crm.repair-schedules') || hasAccess('admin.crm.repair-schedules.my'))
          ? getAdminBellRepairScheduleNotifications(20)
          : Promise.resolve([] as AdminBellRepairScheduleNotification[]);

      const [
        reviewsResult,
        supportResult,
        leadsResult,
        directorResult,
        trainingResult,
        workDaysResult,
        waybillsResult,
        installationSchedulesResult,
        repairSchedulesResult,
      ] = await Promise.allSettled([
        settings?.notifyOnReviews !== false
          ? getAdminReviews(1, 10, undefined, false)
          : Promise.resolve({ data: [] as AdminReview[] }),
        settings?.notifyOnSupportChat !== false
          ? getAdminSupportConversations()
          : Promise.resolve([] as AdminSupportConversation[]),
        hasAccess('admin.forms')
          ? getAdminLeads({ page: 1, limit: 30, status: 'new' })
          : Promise.resolve({ data: [] as UnifiedLeadItem[] }),
        hasAccess('admin.forms.director')
          ? getAdminDirectorMessages({ page: 1, limit: 30, status: 'new' })
          : Promise.resolve({ data: [] as UnifiedLeadItem[] }),
        loadTraining,
        loadWorkDays,
        loadWaybills,
        loadInstallationSchedules,
        loadRepairSchedules,
      ]);

      const newReviews =
        reviewsResult.status === 'fulfilled' ? (reviewsResult.value.data ?? []) : [];
      const supportConvs =
        supportResult.status === 'fulfilled'
          ? Array.isArray(supportResult.value)
            ? supportResult.value
            : []
          : [];
      const activeSupport = supportConvs.filter(
        (c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS'
      );
      const inboxLeads = leadsResult.status === 'fulfilled' ? (leadsResult.value.data ?? []) : [];
      const directorLeads =
        directorResult.status === 'fulfilled' ? (directorResult.value.data ?? []) : [];
      const newLeads = filterNotifiableLeads(
        [...inboxLeads, ...directorLeads],
        settings,
        hasAccess
      );
      const newTraining = trainingResult.status === 'fulfilled' ? (trainingResult.value ?? []) : [];
      const newWorkDays = workDaysResult.status === 'fulfilled' ? (workDaysResult.value ?? []) : [];
      const newWaybills = waybillsResult.status === 'fulfilled' ? (waybillsResult.value ?? []) : [];
      const newInstallationSchedules =
        installationSchedulesResult.status === 'fulfilled'
          ? (installationSchedulesResult.value ?? [])
          : [];
      const newRepairSchedules =
        repairSchedulesResult.status === 'fulfilled' ? (repairSchedulesResult.value ?? []) : [];

      const prev = prevCountsRef.current;
      prevCountsRef.current = {
        reviews: newReviews.length,
        support: activeSupport.length,
        leads: newLeads.length,
        training: newTraining.length,
        workDays: newWorkDays.length,
        waybills: newWaybills.length,
        installationSchedules: newInstallationSchedules.length,
        repairSchedules: newRepairSchedules.length,
      };

      const totalNew =
        newReviews.length +
        activeSupport.length +
        newLeads.length +
        newTraining.length +
        newWorkDays.length +
        newWaybills.length +
        newInstallationSchedules.length +
        newRepairSchedules.length;
      const prevTotal = prev
        ? prev.reviews +
          prev.support +
          prev.leads +
          prev.training +
          prev.workDays +
          prev.waybills +
          prev.installationSchedules +
          prev.repairSchedules
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
        // Если активна Web Push-подписка, десктопное уведомление уже приходит из SW —
        // не дублируем через new Notification из опроса колокольчика.
        let pushActive = false;
        if ('serviceWorker' in navigator && 'PushManager' in window) {
          try {
            const registration = await navigator.serviceWorker.getRegistration('/');
            const subscription = registration
              ? await registration.pushManager.getSubscription()
              : null;
            pushActive = Boolean(subscription);
          } catch {
            pushActive = false;
          }
        }

        if (!pushActive) {
          const latestItem = [
            ...newReviews.map(reviewToBellNotificationItem),
            ...activeSupport.map(supportToBellNotificationItem),
            ...leadsToBellNotificationItems(newLeads),
            ...newTraining.map(trainingToBellNotificationItem),
            ...newWorkDays.map(workDayToBellNotificationItem),
            ...newWaybills.map(waybillToBellNotificationItem),
            ...newInstallationSchedules.map(installationScheduleToBellNotificationItem),
            ...newRepairSchedules.map(repairScheduleToBellNotificationItem),
          ]
            .filter((item) => isBellTypeEnabled(item.type, settings))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

          if (latestItem) {
            const { title, body, tag } = buildDesktopNotification(latestItem);
            new Notification(title, { body, tag });
          }
        }
      }

      setReviewNotifications(newReviews);
      setSupportNotifications(activeSupport);
      setLeadNotifications(newLeads);
      setTrainingNotifications(newTraining);
      setWorkDayNotifications(newWorkDays);
      setWaybillNotifications(newWaybills);
      setInstallationScheduleNotifications(newInstallationSchedules);
      setRepairScheduleNotifications(newRepairSchedules);
    } catch {
      // keep previous notification state on unexpected errors (e.g. token refresh)
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
    if (authLoading || !user?.id || !canLoadAdminNotifications) {
      if (!user?.id) setDismissedNotificationIds(new Set());
      return;
    }
    let cancelled = false;
    void syncDismissedNotificationIds(user.id).then((ids) => {
      if (!cancelled) setDismissedNotificationIds(ids);
    });
    return () => {
      cancelled = true;
    };
  }, [authLoading, canLoadAdminNotifications, user?.id]);

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
      if (!canRunBackgroundNetwork()) return;
      void loadAllNotifications();
    };

    const startDelay = window.setTimeout(run, 2_000);
    const interval = window.setInterval(run, intervalMs);
    const onWake = () => {
      void whenOnlineSettled(run);
    };
    document.addEventListener('visibilitychange', onWake);
    window.addEventListener('online', onWake);
    return () => {
      window.clearTimeout(startDelay);
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onWake);
      window.removeEventListener('online', onWake);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- интервал только при смене настроек, не при каждом пересоздании loadAllNotifications
  }, [notificationSettings]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inBell = notificationRef.current?.contains(target);
      const inPanel = notificationsDropdownRef.current?.contains(target);
      if (!inBell && !inPanel) {
        setShowNotifications(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useLayoutEffect(() => {
    if (!showNotifications) return;

    const syncBox = () => {
      const header = headerRef.current;
      const bell = notificationRef.current;
      if (!header || !bell) return;

      const gutter = 16;
      const isMobile = window.matchMedia('(max-width: 1024px)').matches;
      if (isMobile) {
        setNotificationsPanelBox({
          top: Math.round(header.getBoundingClientRect().bottom + 8),
          left: gutter,
          width: Math.max(280, window.innerWidth - gutter * 2),
          mobile: true,
        });
        return;
      }

      const bellRect = bell.getBoundingClientRect();
      const width = Math.min(360, window.innerWidth - gutter * 2);
      const left = Math.min(
        Math.max(gutter, Math.round(bellRect.right - width)),
        window.innerWidth - width - gutter
      );
      setNotificationsPanelBox({
        top: Math.round(bellRect.bottom + 8),
        left,
        width,
        mobile: false,
      });
    };

    syncBox();
    window.addEventListener('resize', syncBox);
    window.addEventListener('scroll', syncBox, true);
    return () => {
      window.removeEventListener('resize', syncBox);
      window.removeEventListener('scroll', syncBox, true);
    };
  }, [showNotifications]);

  useEffect(() => {
    if (showNotifications) {
      setNotificationsPanelRendered(true);
      return;
    }
    setNotificationsPanelOpen(false);
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setNotificationsPanelRendered(false);
      setNotificationsPanelBox(null);
    }
  }, [showNotifications]);

  useEffect(() => {
    if (!showNotifications || !notificationsPanelBox || !notificationsPanelRendered) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setNotificationsPanelOpen(true));
    });
    return () => window.cancelAnimationFrame(id);
  }, [showNotifications, notificationsPanelBox, notificationsPanelRendered]);

  const finishNotificationsPanelExit = useCallback(() => {
    if (showNotifications) return;
    setNotificationsPanelRendered(false);
    setNotificationsPanelBox(null);
  }, [showNotifications]);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'Пользователь';
  const displayTitle = user?.jobTitle?.trim() || getRoleLabel(user?.role);

  const handleLogout = () => {
    logout();
    window.location.href = '/admin/login';
  };

  const notificationItems: NotificationItem[] = [
    ...reviewNotifications.map(reviewToBellNotificationItem),
    ...supportNotifications.map(supportToBellNotificationItem),
    ...leadsToBellNotificationItems(leadNotifications),
    ...trainingNotifications.map(trainingToBellNotificationItem),
    ...workDayNotifications.map(workDayToBellNotificationItem),
    ...waybillNotifications.map(waybillToBellNotificationItem),
    ...installationScheduleNotifications.map(installationScheduleToBellNotificationItem),
    ...repairScheduleNotifications.map(repairScheduleToBellNotificationItem),
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
  useFaviconBadge(unreadCount);
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
    <header className={styles.header} ref={headerRef}>
      <div className={styles.headerStart}>
        <span className={`${styles.headerRevealHost} ${styles.headerReveal}`}>
          <Logo
            href="/"
            ariaLabel="На главную — Территория интерьерных решений"
            className={styles.headerLogoSvg}
            linkClassName={styles.headerLogo}
          />
        </span>
        <div
          className={`${styles.historyNav} ${styles.headerReveal}`}
          role="group"
          aria-label="Навигация по истории"
        >
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
      <div className={`${styles.searchWrapper} ${styles.headerReveal} ${styles.headerRevealFade}`}>
        <input
          type="search"
          placeholder="Поиск по админ-панели..."
          className={styles.searchInput}
        />
        <span className={styles.searchIcon}>🔍</span>
      </div>

      <div className={styles.actions}>
        <span className={`${styles.headerRevealHost} ${styles.headerReveal}`}>
          <AdminOnlineAvatars />
        </span>
        <span className={`${styles.headerRevealHost} ${styles.headerReveal}`}>
          <WorkDayWidget />
        </span>
        {canTogglePublicSiteEdit && (
          <span className={styles.headerReveal}>
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
          </span>
        )}
        <button
          type="button"
          className={`${styles.iconButton} ${styles.headerReveal}`}
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
          <div
            className={`${styles.notificationWrapper} ${styles.headerReveal}`}
            ref={notificationRef}
          >
            <button
              className={styles.iconButton}
              onClick={() => {
                setShowNotifications(!showNotifications);
                if (!showNotifications) loadAllNotifications();
              }}
              aria-label="Уведомления"
              title="Уведомления"
            >
              <NotificationBellIcon className={styles.bellIcon} />
              {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
            </button>

            {notificationsPanelRendered &&
              notificationsPanelBox &&
              createPortal(
                <>
                  {notificationsPanelBox.mobile ? (
                    <button
                      type="button"
                      className={`${styles.notificationsBackdrop}${
                        notificationsPanelOpen ? ` ${styles.notificationsBackdropOpen}` : ''
                      }`}
                      aria-label="Закрыть уведомления"
                      onClick={() => setShowNotifications(false)}
                    />
                  ) : null}
                  <div
                    ref={notificationsDropdownRef}
                    className={`${styles.dropdown} ${styles.notificationsDropdown} ${styles.notificationsDropdownPortal}${
                      notificationsPanelOpen ? ` ${styles.notificationsDropdownPortalOpen}` : ''
                    }`}
                    style={{
                      top: notificationsPanelBox.top,
                      left: notificationsPanelBox.left,
                      width: notificationsPanelBox.width,
                      minWidth: notificationsPanelBox.width,
                      maxWidth: notificationsPanelBox.width,
                    }}
                    onTransitionEnd={(event) => {
                      if (event.target !== event.currentTarget) return;
                      if (event.propertyName !== 'opacity') return;
                      finishNotificationsPanelExit();
                    }}
                  >
                    <div className={styles.dropdownHeader}>
                      <span>Уведомления</span>
                      <div className={styles.dropdownHeaderActions}>
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
                      {notificationSettings &&
                      (!notificationSettings.desktopNotifications ||
                        (typeof window !== 'undefined' &&
                          'Notification' in window &&
                          Notification.permission !== 'granted')) ? (
                        <button
                          type="button"
                          className={styles.notificationSettingsButton}
                          onClick={() => {
                            setShowNotifications(false);
                            setShowMyNotificationsModal(true);
                          }}
                        >
                          Включить на рабочем столе
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={styles.notificationSettingsButton}
                        onClick={() => {
                          setShowNotifications(false);
                          setShowMyNotificationsModal(true);
                        }}
                      >
                        Мои уведомления
                      </button>
                      {canOpenNotificationSettings ? (
                        <Link
                          href={getSafeHref(NOTIFICATIONS_SETTINGS_HREF, '#')}
                          className={styles.notificationSettingsButton}
                          onClick={() => setShowNotifications(false)}
                        >
                          Настройки ролей
                        </Link>
                      ) : null}
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
                </>,
                document.querySelector('[data-admin-shell]') ?? document.body
              )}
          </div>
        ) : null}

        <div className={`${styles.userWrapper} ${styles.headerReveal}`} ref={userMenuRef}>
          <button
            className={styles.userButton}
            onClick={() => setShowUserMenu(!showUserMenu)}
            title={`${displayName}${displayTitle ? ` — ${displayTitle}` : ''}`}
          >
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
              <span className={styles.userRole}>{displayTitle}</span>
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
              <button
                type="button"
                className={styles.dropdownItem}
                onClick={() => {
                  setShowUserMenu(false);
                  setShowProfileModal(true);
                }}
              >
                <ProfileMenuIcon size={32} className={styles.dropdownItemIcon} />
                Профиль
              </button>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={handleLogout}>
                <ProfileUserSquareIcon size={32} className={styles.dropdownItemIcon} />
                Выйти
              </button>
            </div>
          )}
        </div>

        {onMobileMenuOpen ? (
          <button
            type="button"
            className={`${styles.mobileMenuButton} ${styles.headerReveal}`}
            onClick={onMobileMenuOpen}
            title={mobileMenuOpen ? 'Закрыть меню' : 'Открыть меню'}
            aria-label={mobileMenuOpen ? 'Закрыть меню навигации' : 'Открыть меню навигации'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <XMarkIcon className={styles.mobileMenuIcon} aria-hidden />
            ) : (
              <Bars3Icon className={styles.mobileMenuIcon} aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      <AdminProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />
      <AdminMyNotificationsModal
        open={showMyNotificationsModal}
        onClose={() => setShowMyNotificationsModal(false)}
        onSaved={(settings) => setNotificationSettings(settings)}
      />
    </header>
  );
}
