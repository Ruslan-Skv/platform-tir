'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getUserCabinetSettings } from '@/shared/api/user-cabinet';
import type { UserCabinetSettings } from '@/shared/api/user-cabinet';
import { type HistoryItem, fetchUserHistory } from '@/shared/api/user-history';
import {
  getUserNotificationHistory,
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from '@/shared/api/user-notifications';
import type {
  UserNotification,
  UserNotificationHistoryResponse,
} from '@/shared/api/user-notifications';
import { apiFetch } from '@/shared/lib/api-fetch';
import { getAvatarUrl, getInitials } from '@/shared/lib/avatar';
import {
  PHONE_FORMAT_HINT,
  PHONE_PLACEHOLDER,
  digitsOnlyPhone,
  formatPhoneDisplay,
  formatPhoneInput,
  getOptionalPhoneValidationMessage,
  isValidPhone,
  normalizePhoneForStorage,
} from '@/shared/lib/phone';
import { getSafeHref } from '@/shared/lib/sanitize';

import styles from './ProfilePage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Tab = 'profile' | 'history' | 'notifications' | 'notificationHistory' | 'password';

const PROFILE_TABS: { id: Tab; label: string }[] = [
  { id: 'profile', label: 'Личные данные' },
  { id: 'history', label: 'История' },
  { id: 'notifications', label: 'Уведомления' },
  { id: 'notificationHistory', label: 'История уведомлений' },
  { id: 'password', label: 'Смена пароля' },
];

const HISTORY_TYPE_LABELS: Record<HistoryItem['type'], string> = {
  order: 'Заказ',
  service_order: 'Услуги',
  contract: 'Договор',
  payment: 'Оплата',
};

const PAYMENT_TYPE_LABELS: Record<string, string> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Аванс',
  FINAL: 'Окончательный расчёт',
  AMENDMENT: 'По доп. соглашению',
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: string | number) {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    minimumFractionDigits: 0,
  }).format(num);
}

export function ProfilePageView() {
  const { user, isAuthenticated, isLoading, logout, refreshUser, updateProfile, uploadAvatar } =
    useUserAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [cabinetSettings, setCabinetSettings] = useState<UserCabinetSettings | null>(null);

  // Profile
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
  });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [phoneTouched, setPhoneTouched] = useState(false);

  // History
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadingMore, setHistoryLoadingMore] = useState(false);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);

  // Notifications
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifSaving, setNotifSaving] = useState(false);
  const [notifNotifyChat, setNotifNotifyChat] = useState(true);

  // Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  // Avatar
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const avatarInputRef = React.useRef<HTMLInputElement>(null);

  // Notification history
  const [notificationHistory, setNotificationHistory] =
    useState<UserNotificationHistoryResponse | null>(null);
  const [notificationHistoryLoading, setNotificationHistoryLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  // Обновить данные пользователя при загрузке страницы профиля (актуальные аватарка и др.)
  useEffect(() => {
    if (isAuthenticated && user) {
      refreshUser();
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps -- только при монтировании

  useEffect(() => {
    getUserCabinetSettings()
      .then(setCabinetSettings)
      .catch(() => setCabinetSettings(null));
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        phone: user.phone ? formatPhoneDisplay(user.phone) : '',
      });
      setPhoneTouched(false);
      setAvatarLoadError(false);
    }
  }, [user]);

  const comparableProfilePhone = (phone: string) => {
    const trimmed = phone.trim();
    if (!trimmed) return '';
    return normalizePhoneForStorage(trimmed) || trimmed;
  };

  const phoneValidationError = getOptionalPhoneValidationMessage(formData.phone);
  const showPhoneError =
    phoneValidationError &&
    (phoneTouched || (digitsOnlyPhone(formData.phone).length > 0 && !isValidPhone(formData.phone)));

  const isProfileDirty = useMemo(() => {
    if (!user) return false;
    return (
      (formData.firstName || '') !== (user.firstName || '') ||
      (formData.lastName || '') !== (user.lastName || '') ||
      comparableProfilePhone(formData.phone) !== comparableProfilePhone(user.phone || '')
    );
  }, [user, formData.firstName, formData.lastName, formData.phone]);

  const isProfileSaveDisabled = isSaving || !isProfileDirty || !!phoneValidationError;

  const loadHistory = useCallback(async (page: number, append: boolean) => {
    if (append) {
      setHistoryLoadingMore(true);
    } else {
      setHistoryLoading(true);
    }
    try {
      const data = await fetchUserHistory(page, 20);
      setHistoryItems((prev) => (append ? [...prev, ...data.data] : data.data));
      setHistoryHasMore(data.meta.hasMore);
      setHistoryPage(page);
    } catch {
      if (!append) setHistoryItems([]);
      setHistoryHasMore(false);
    } finally {
      setHistoryLoading(false);
      setHistoryLoadingMore(false);
    }
  }, []);

  const loadNotifSettings = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await getUserNotificationSettings();
      setNotifNotifyChat(data.notifyOnSupportChatReply);
    } catch {
      // оставляем текущее значение чекбокса
    } finally {
      setNotifLoading(false);
    }
  }, []);

  const loadNotificationHistory = useCallback(async () => {
    setNotificationHistoryLoading(true);
    try {
      const data = await getUserNotificationHistory({ page: 1, limit: 50 });
      setNotificationHistory(data);
    } catch {
      setNotificationHistory(null);
    } finally {
      setNotificationHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'history' && isAuthenticated) loadHistory(1, false);
  }, [activeTab, isAuthenticated, loadHistory]);

  useEffect(() => {
    if (activeTab === 'notifications' && isAuthenticated) loadNotifSettings();
  }, [activeTab, isAuthenticated, loadNotifSettings]);

  useEffect(() => {
    if (activeTab === 'notificationHistory' && isAuthenticated) loadNotificationHistory();
  }, [activeTab, isAuthenticated, loadNotificationHistory]);

  const allTabs = PROFILE_TABS;

  useEffect(() => {
    if (!cabinetSettings) return;
    const visibleTabs = PROFILE_TABS.filter((t) => {
      if (t.id === 'profile') return cabinetSettings.showProfileSection;
      if (t.id === 'history') return cabinetSettings.showOrdersSection;
      if (t.id === 'notifications') return cabinetSettings.showNotificationsSection;
      if (t.id === 'notificationHistory') return cabinetSettings.showNotificationHistory !== false;
      if (t.id === 'password') return cabinetSettings.showPasswordSection;
      return true;
    });
    if (visibleTabs.length > 0 && !visibleTabs.some((t) => t.id === activeTab)) {
      setActiveTab(visibleTabs[0].id);
    }
  }, [cabinetSettings, activeTab]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadAvatar) return;
    setAvatarUploading(true);
    setAvatarLoadError(false);
    setProfileError('');
    setProfileSuccess('');
    try {
      const result = await uploadAvatar(file);
      if (result.success) {
        setProfileSuccess('Аватарка обновлена');
      } else {
        setProfileError(result.error || 'Ошибка загрузки');
      }
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const handleRemoveAvatar = async () => {
    setProfileError('');
    setProfileSuccess('');
    try {
      const result = await updateProfile({ avatar: null });
      if (result.success) {
        setProfileSuccess('Аватарка удалена');
      } else {
        setProfileError(result.error || 'Ошибка');
      }
    } catch {
      setProfileError('Ошибка при удалении');
    }
  };

  const handleSaveProfile = async () => {
    if (!isProfileDirty || phoneValidationError) {
      setPhoneTouched(true);
      return;
    }
    setProfileError('');
    setProfileSuccess('');
    setIsSaving(true);
    try {
      const phoneStored = normalizePhoneForStorage(formData.phone);
      const result = await updateProfile({
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        phone: phoneStored || null,
      });
      if (result.success) {
        setProfileSuccess('Профиль обновлён');
      } else {
        setProfileError(result.error || 'Ошибка');
      }
    } catch {
      setProfileError('Ошибка при сохранении');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveNotif = async () => {
    setNotifSaving(true);
    try {
      const updated = await updateUserNotificationSettings({
        notifyOnSupportChatReply: notifNotifyChat,
      });
      setNotifNotifyChat(updated.notifyOnSupportChatReply);
    } catch {
      // ignore
    } finally {
      setNotifSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');
    if (newPassword !== confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов');
      return;
    }
    setIsSavingPassword(true);
    try {
      const token = localStorage.getItem('user_token') || localStorage.getItem('admin_token');
      const res = await apiFetch(`${API_URL}/users/${user?.id}/password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Ошибка смены пароля');
      }
      setPasswordSuccess('Пароль изменён. Войдите заново.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        logout();
        router.push('/login');
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  const tabs = cabinetSettings
    ? allTabs.filter((t) => {
        if (t.id === 'profile') return cabinetSettings.showProfileSection;
        if (t.id === 'history') return cabinetSettings.showOrdersSection;
        if (t.id === 'notifications') return cabinetSettings.showNotificationsSection;
        if (t.id === 'notificationHistory')
          return cabinetSettings.showNotificationHistory !== false;
        if (t.id === 'password') return cabinetSettings.showPasswordSection;
        return true;
      })
    : allTabs;

  const quickLinks = [
    { href: '/favorites', label: 'Избранное' },
    { href: '/compare', label: 'Сравнение' },
    { href: '/cart', label: 'Корзина' },
    { href: '/catalog/products', label: 'Каталог' },
  ];

  return (
    <div className={styles.container}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/">Главная</Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span>Личный кабинет</span>
      </nav>
      <div className={styles.page}>
        <div className={styles.header}>
          <h1 className={styles.title}>Личный кабинет</h1>
          <button onClick={handleLogout} className={styles.logoutButton}>
            Выйти
          </button>
        </div>

        {(!cabinetSettings || cabinetSettings.showQuickLinks) && (
          <div className={styles.quickLinks}>
            {quickLinks.map((link) => (
              <Link key={link.href} href={getSafeHref(link.href)} className={styles.quickLink}>
                {link.label}
              </Link>
            ))}
          </div>
        )}
        <nav className={styles.tabs} aria-label="Разделы профиля">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={styles.content}>
          {activeTab === 'profile' && cabinetSettings?.showProfileSection !== false && (
            <section className={styles.section}>
              {profileError && <div className={styles.error}>{profileError}</div>}
              {profileSuccess && <div className={styles.success}>{profileSuccess}</div>}

              <div className={styles.avatarBlock}>
                <div className={styles.avatarWrapper}>
                  {user.avatar && !avatarLoadError ? (
                    <img
                      src={getAvatarUrl(user.avatar) ?? ''}
                      alt="Аватар"
                      className={styles.avatarImage}
                      onError={() => setAvatarLoadError(true)}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder}>
                      {getInitials(user.firstName, user.lastName, user.email)}
                    </div>
                  )}
                </div>
                <div className={styles.avatarActions}>
                  <input
                    ref={avatarInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleAvatarChange}
                    className={styles.avatarInput}
                    aria-label="Выбрать фото"
                  />
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className={styles.avatarButton}
                    disabled={avatarUploading}
                  >
                    {avatarUploading ? 'Загрузка...' : 'Загрузить фото'}
                  </button>
                  {user.avatar && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className={styles.avatarRemoveButton}
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Email</label>
                <div className={styles.value}>{user.email}</div>
              </div>

              <div className={`${styles.field} ${styles.fieldShort}`}>
                <label className={styles.label}>Имя</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className={styles.input}
                  placeholder="Введите имя"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldShort}`}>
                <label className={styles.label}>Фамилия</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className={styles.input}
                  placeholder="Введите фамилию"
                />
              </div>

              <div className={`${styles.field} ${styles.fieldShort}`}>
                <label className={styles.label} htmlFor="profile-phone">
                  Телефон
                </label>
                <input
                  id="profile-phone"
                  type="tel"
                  inputMode="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: formatPhoneInput(e.target.value) })
                  }
                  onBlur={() => setPhoneTouched(true)}
                  className={`${styles.input} ${showPhoneError ? styles.inputInvalid : ''}`}
                  placeholder={PHONE_PLACEHOLDER}
                  autoComplete="tel"
                  aria-invalid={showPhoneError ? true : undefined}
                  aria-describedby={
                    showPhoneError ? 'profile-phone-hint profile-phone-error' : 'profile-phone-hint'
                  }
                />
                <p id="profile-phone-hint" className={styles.fieldHint}>
                  Необязательно. Помогает находить ваши договоры и оплаты в разделе «История».{' '}
                  {PHONE_FORMAT_HINT}
                </p>
                {showPhoneError ? (
                  <p id="profile-phone-error" className={styles.fieldError} role="alert">
                    {phoneValidationError}
                  </p>
                ) : null}
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className={styles.saveButton}
                  disabled={isProfileSaveDisabled}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </section>
          )}

          {activeTab === 'history' && cabinetSettings?.showOrdersSection !== false && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>История</h2>
              <p className={styles.readOnlyHint}>
                Заказы, договоры и оплаты, связанные с вашим аккаунтом.
              </p>
              {historyLoading ? (
                <p className={styles.loading}>Загрузка истории...</p>
              ) : historyItems.length === 0 ? (
                <p className={styles.empty}>
                  Пока нет событий. <Link href="/catalog/products">Перейти в каталог</Link>
                </p>
              ) : (
                <>
                  <div className={styles.historyTimeline}>
                    {historyItems.map((item) => (
                      <article key={item.id} className={styles.historyItem}>
                        <div className={styles.historyMarker} aria-hidden />
                        <div className={styles.historyCard}>
                          <div className={styles.historyHeader}>
                            <span className={styles.historyTypeBadge}>
                              {HISTORY_TYPE_LABELS[item.type]}
                            </span>
                            <time className={styles.historyDate} dateTime={item.occurredAt}>
                              {formatDate(item.occurredAt)}
                            </time>
                            {item.statusLabel && (
                              <span
                                className={`${styles.orderStatus} ${item.status ? styles[`status_${item.status}`] : ''}`}
                              >
                                {item.statusLabel}
                              </span>
                            )}
                          </div>
                          <h3 className={styles.historyTitle}>{item.title}</h3>
                          {item.subtitle && (
                            <p className={styles.historySubtitle}>{item.subtitle}</p>
                          )}
                          {item.type === 'order' && item.meta.itemsPreview.length > 0 && (
                            <div className={styles.orderItems}>
                              {item.meta.itemsPreview.slice(0, 3).map((line) => (
                                <span key={line.id} className={styles.orderItemName}>
                                  {line.name} × {line.quantity}
                                </span>
                              ))}
                              {item.meta.itemsTotal > 3 && (
                                <span className={styles.orderItemMore}>
                                  и ещё {item.meta.itemsTotal - 3}
                                </span>
                              )}
                            </div>
                          )}
                          {item.type === 'payment' && item.meta.paymentType && (
                            <p className={styles.historySubtitle}>
                              {PAYMENT_TYPE_LABELS[item.meta.paymentType] ?? item.meta.paymentType}
                            </p>
                          )}
                          <div className={styles.historyFooter}>
                            {item.amount != null && (
                              <span className={styles.orderTotal}>{formatPrice(item.amount)}</span>
                            )}
                            {item.type === 'order' && (
                              <Link
                                href={`/checkout?orderId=${encodeURIComponent(item.meta.orderId)}`}
                                className={styles.historyActionLink}
                              >
                                Подробнее
                              </Link>
                            )}
                            {item.type === 'contract' && item.meta.signUrl && (
                              <Link href={item.meta.signUrl} className={styles.historyActionLink}>
                                Подписать договор
                              </Link>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                  {historyHasMore && (
                    <div className={styles.historyLoadMore}>
                      <button
                        type="button"
                        className={styles.saveButton}
                        disabled={historyLoadingMore}
                        onClick={() => loadHistory(historyPage + 1, true)}
                      >
                        {historyLoadingMore ? 'Загрузка...' : 'Показать ещё'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
          )}

          {activeTab === 'notificationHistory' &&
            cabinetSettings?.showNotificationHistory !== false && (
              <section className={styles.section}>
                <h2 className={styles.sectionTitle}>История уведомлений</h2>
                <p className={styles.readOnlyHint}>
                  История уведомлений доступна только для просмотра. Редактирование и удаление
                  недоступны.
                </p>
                {notificationHistoryLoading ? (
                  <p className={styles.loading}>Загрузка...</p>
                ) : !notificationHistory || notificationHistory.data.length === 0 ? (
                  <p className={styles.empty}>У вас пока нет уведомлений.</p>
                ) : (
                  <div className={styles.notificationList}>
                    {notificationHistory.data.map((n: UserNotification) => (
                      <div key={n.id} className={styles.notificationCard}>
                        <div className={styles.notificationHeader}>
                          <span className={styles.notificationTitle}>{n.title}</span>
                          <span className={styles.notificationDate}>{formatDate(n.createdAt)}</span>
                        </div>
                        <div className={styles.notificationMessage}>{n.message}</div>
                        {n.type && (
                          <span className={styles.notificationType}>
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
                )}
              </section>
            )}

          {activeTab === 'notifications' && cabinetSettings?.showNotificationsSection !== false && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Настройки уведомлений</h2>
              {notifLoading ? (
                <p className={styles.loading}>Загрузка...</p>
              ) : (
                <>
                  <div className={styles.checkboxField}>
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={notifNotifyChat}
                        onChange={(e) => setNotifNotifyChat(e.target.checked)}
                      />
                      Уведомлять при ответе в чате поддержки
                    </label>
                  </div>
                  <button
                    onClick={handleSaveNotif}
                    className={styles.saveButton}
                    disabled={notifSaving}
                  >
                    {notifSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </>
              )}
            </section>
          )}

          {activeTab === 'password' && cabinetSettings?.showPasswordSection !== false && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Смена пароля</h2>
              {passwordError && <div className={styles.error}>{passwordError}</div>}
              {passwordSuccess && <div className={styles.success}>{passwordSuccess}</div>}
              <form onSubmit={handleChangePassword} className={styles.passwordForm}>
                <div className={styles.field}>
                  <label className={styles.label}>Текущий пароль</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className={styles.input}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Новый пароль</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={styles.input}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <div className={styles.field}>
                  <label className={styles.label}>Подтвердите новый пароль</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={styles.input}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
                <button type="submit" className={styles.saveButton} disabled={isSavingPassword}>
                  {isSavingPassword ? 'Сохранение...' : 'Сменить пароль'}
                </button>
              </form>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
