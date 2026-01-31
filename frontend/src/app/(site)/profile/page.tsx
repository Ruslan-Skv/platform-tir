'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { useUserAuth } from '@/features/auth/context/UserAuthContext';
import { getUserCabinetSettings } from '@/shared/api/user-cabinet';
import type { UserCabinetSettings } from '@/shared/api/user-cabinet';
import {
  getUserNotificationHistory,
  getUserNotificationSettings,
  updateUserNotificationSettings,
} from '@/shared/api/user-notifications';
import type {
  UserNotification,
  UserNotificationHistoryResponse,
  UserNotificationSettings,
} from '@/shared/api/user-notifications';
import { type UserOrder, getUserOrders } from '@/shared/api/user-orders';

import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type Tab = 'profile' | 'orders' | 'notifications' | 'notificationHistory' | 'password';

const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  REFUNDED: 'Возврат',
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

function getAvatarUrl(avatar: string | null | undefined): string | null {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  const base = apiUrl.replace(/\/api\/v1\/?$/, '');
  return `${base}${avatar}`;
}

function getInitials(firstName: string | null, lastName: string | null, email: string): string {
  if (firstName && lastName) return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (email) return email.slice(0, 2).toUpperCase();
  return '?';
}

export default function ProfilePage() {
  const { user, isAuthenticated, isLoading, logout, updateProfile, uploadAvatar } = useUserAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [cabinetSettings, setCabinetSettings] = useState<UserCabinetSettings | null>(null);

  // Profile
  const [formData, setFormData] = useState({ email: '', firstName: '', lastName: '' });
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Orders
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // Notifications
  const [notifSettings, setNotifSettings] = useState<UserNotificationSettings | null>(null);
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
      });
    }
  }, [user]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const data = await getUserOrders();
      setOrders(data);
    } catch {
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const loadNotifSettings = useCallback(async () => {
    setNotifLoading(true);
    try {
      const data = await getUserNotificationSettings();
      setNotifSettings(data);
      setNotifNotifyChat(data.notifyOnSupportChatReply);
    } catch {
      setNotifSettings(null);
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
    if (activeTab === 'orders' && isAuthenticated) loadOrders();
  }, [activeTab, isAuthenticated, loadOrders]);

  useEffect(() => {
    if (activeTab === 'notifications' && isAuthenticated) loadNotifSettings();
  }, [activeTab, isAuthenticated, loadNotifSettings]);

  useEffect(() => {
    if (activeTab === 'notificationHistory' && isAuthenticated) loadNotificationHistory();
  }, [activeTab, isAuthenticated, loadNotificationHistory]);

  const allTabs: { id: Tab; label: string }[] = [
    { id: 'profile', label: 'Личные данные' },
    { id: 'orders', label: 'Мои заказы' },
    { id: 'notifications', label: 'Уведомления' },
    { id: 'notificationHistory', label: 'История уведомлений' },
    { id: 'password', label: 'Смена пароля' },
  ];

  useEffect(() => {
    if (!cabinetSettings) return;
    const visibleTabs = allTabs.filter((t) => {
      if (t.id === 'profile') return cabinetSettings.showProfileSection;
      if (t.id === 'orders') return cabinetSettings.showOrdersSection;
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
    setProfileError('');
    setProfileSuccess('');
    setIsSaving(true);
    try {
      const result = await updateProfile({
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
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
      await updateUserNotificationSettings({ notifyOnSupportChatReply: notifNotifyChat });
      setNotifSettings((prev) =>
        prev ? { ...prev, notifyOnSupportChatReply: notifNotifyChat } : null
      );
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
      const res = await fetch(`${API_URL}/users/${user?.id}/password`, {
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
    router.push('/');
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
        if (t.id === 'orders') return cabinetSettings.showOrdersSection;
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
              <Link key={link.href} href={link.href} className={styles.quickLink}>
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
                  {user.avatar ? (
                    <img
                      src={getAvatarUrl(user.avatar) ?? ''}
                      alt="Аватар"
                      className={styles.avatarImage}
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

              <div className={styles.actions}>
                <button
                  onClick={handleSaveProfile}
                  className={styles.saveButton}
                  disabled={isSaving}
                >
                  {isSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </section>
          )}

          {activeTab === 'orders' && cabinetSettings?.showOrdersSection !== false && (
            <section className={styles.section}>
              <h2 className={styles.sectionTitle}>Мои заказы</h2>
              {ordersLoading ? (
                <p className={styles.loading}>Загрузка заказов...</p>
              ) : orders.length === 0 ? (
                <p className={styles.empty}>
                  У вас пока нет заказов. <Link href="/catalog/products">Перейти в каталог</Link>
                </p>
              ) : (
                <div className={styles.ordersList}>
                  {orders.map((order) => (
                    <div key={order.id} className={styles.orderCard}>
                      <div className={styles.orderHeader}>
                        <span className={styles.orderNumber}>{order.orderNumber}</span>
                        <span className={styles.orderDate}>{formatDate(order.createdAt)}</span>
                        <span
                          className={`${styles.orderStatus} ${styles[`status_${order.status}`]}`}
                        >
                          {ORDER_STATUS_LABELS[order.status] ?? order.status}
                        </span>
                      </div>
                      <div className={styles.orderBody}>
                        <div className={styles.orderItems}>
                          {order.items.slice(0, 3).map((item) => (
                            <span key={item.id} className={styles.orderItemName}>
                              {item.product?.name ?? 'Товар'} × {item.quantity}
                            </span>
                          ))}
                          {order.items.length > 3 && (
                            <span className={styles.orderItemMore}>
                              и ещё {order.items.length - 3}
                            </span>
                          )}
                        </div>
                        <div className={styles.orderFooter}>
                          <span className={styles.orderTotal}>
                            Итого: {formatPrice(order.total)}
                          </span>
                          <span className={styles.orderPayment}>
                            {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
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
