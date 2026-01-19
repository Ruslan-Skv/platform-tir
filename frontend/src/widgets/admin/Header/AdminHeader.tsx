'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { useAuth } from '@/features/auth';

import styles from './AdminHeader.module.css';

const ROLE_NAMES: Record<string, string> = {
  ADMIN: 'Администратор',
  MANAGER: 'Менеджер',
  CONTENT_MANAGER: 'Контент-менеджер',
};

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const displayName = user?.firstName
    ? `${user.firstName} ${user.lastName || ''}`.trim()
    : user?.email || 'Пользователь';

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const notifications = [
    { id: 1, text: 'Новый заказ #1234', time: '5 мин назад', unread: true },
    { id: 2, text: 'Товар "Дверь Аргус" заканчивается', time: '1 час назад', unread: true },
    { id: 3, text: 'Новый клиент зарегистрировался', time: '2 часа назад', unread: false },
  ];

  const unreadCount = notifications.filter((n) => n.unread).length;

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
        <div className={styles.notificationWrapper}>
          <button
            className={styles.iconButton}
            onClick={() => setShowNotifications(!showNotifications)}
          >
            🔔
            {unreadCount > 0 && <span className={styles.badge}>{unreadCount}</span>}
          </button>

          {showNotifications && (
            <div className={styles.dropdown}>
              <div className={styles.dropdownHeader}>
                <span>Уведомления</span>
                <button className={styles.markAllRead}>Прочитать все</button>
              </div>
              <div className={styles.notificationList}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`${styles.notificationItem} ${
                      notification.unread ? styles.unread : ''
                    }`}
                  >
                    <p className={styles.notificationText}>{notification.text}</p>
                    <span className={styles.notificationTime}>{notification.time}</span>
                  </div>
                ))}
              </div>
              <div className={styles.dropdownFooter}>
                <a href="/admin/notifications">Все уведомления</a>
              </div>
            </div>
          )}
        </div>

        <div className={styles.userWrapper}>
          <button className={styles.userButton} onClick={() => setShowUserMenu(!showUserMenu)}>
            <div className={styles.avatar}>{displayName.charAt(0).toUpperCase()}</div>
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
