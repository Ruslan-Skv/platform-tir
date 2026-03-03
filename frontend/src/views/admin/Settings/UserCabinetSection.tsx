'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import type { UserCabinetSettings } from '@/shared/api/admin-user-cabinet';
import {
  getAdminUserCabinetSettings,
  updateAdminUserCabinetSettings,
} from '@/shared/api/admin-user-cabinet';

import styles from './UserCabinetSection.module.css';

export function UserCabinetSection() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<UserCabinetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getAdminUserCabinetSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      await updateAdminUserCabinetSettings(settings);
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.accessDenied}>
          Настройки личного кабинета доступны только супер-администратору.
        </p>
      </div>
    );
  }

  if (loading || !settings) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки личного кабинета пользователя</h2>
        <p className={styles.sectionDescription}>
          Управление разделами, отображаемыми в личном кабинете пользователя на сайте. Отключённые
          разделы не будут видны пользователям.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>}
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showProfileSection"
              checked={settings.showProfileSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showProfileSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showProfileSection">Показывать раздел «Личные данные»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showOrdersSection"
              checked={settings.showOrdersSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showOrdersSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showOrdersSection">Показывать раздел «Мои заказы»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showNotificationsSection"
              checked={settings.showNotificationsSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showNotificationsSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showNotificationsSection">Показывать раздел «Уведомления»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showNotificationHistory"
              checked={settings.showNotificationHistory !== false}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showNotificationHistory: e.target.checked } : s))
              }
            />
            <label htmlFor="showNotificationHistory">
              Показывать историю уведомлений (только чтение, без редактирования и удаления)
            </label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showPasswordSection"
              checked={settings.showPasswordSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showPasswordSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showPasswordSection">Показывать раздел «Смена пароля»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showQuickLinks"
              checked={settings.showQuickLinks}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showQuickLinks: e.target.checked } : s))
              }
            />
            <label htmlFor="showQuickLinks">
              Показывать быстрые ссылки (Избранное, Корзина и др.)
            </label>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <Link href="/profile" target="_blank" rel="noreferrer" className={styles.previewLink}>
              Просмотр на сайте →
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
