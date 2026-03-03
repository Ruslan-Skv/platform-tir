'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import { ROLES_CONFIG } from '@/pages/admin/Settings/rolesConfig';
import {
  getAdminSitePublicSettings,
  updateAdminSitePublicSettings,
} from '@/shared/api/admin-site-public';

import styles from './page.module.css';

/** Роли, для которых логично показывать кнопку «Админка» (исключены USER и GUEST). */
const SELECTABLE_ROLES = ROLES_CONFIG.filter((r) => r.id !== 'USER' && r.id !== 'GUEST').map(
  (r) => r.id
);

const DEFAULT_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
  'BRIGADIER',
  'LEAD_SPECIALIST_FURNITURE',
  'LEAD_SPECIALIST_WINDOWS_DOORS',
  'SURVEYOR',
  'DRIVER',
  'INSTALLER',
];

export default function AdminSettingsAdminLinkPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<{
    rolesShowAdminLink: string[] | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminSitePublicSettings();
      setSettings({
        rolesShowAdminLink:
          Array.isArray(data.rolesShowAdminLink) && data.rolesShowAdminLink.length > 0
            ? data.rolesShowAdminLink
            : null,
      });
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRole = (roleId: string, checked: boolean) => {
    if (!settings) return;
    const current = settings.rolesShowAdminLink ?? DEFAULT_ROLES;
    const next = checked ? [...current, roleId] : current.filter((r) => r !== roleId);
    setSettings({
      rolesShowAdminLink: next.length > 0 ? next : null,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateAdminSitePublicSettings({
        rolesShowAdminLink: settings.rolesShowAdminLink,
      });
      setMessage({ text: 'Настройки сохранены' });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.accessDenied}>
          Настройка кнопки «Админка» доступна только супер-администратору.
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

  const currentRoles = settings.rolesShowAdminLink ?? DEFAULT_ROLES;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Кнопка «Админка» на публичном сайте</h1>
        <p className={styles.subtitle}>
          Выберите роли, для которых отображается кнопка-иконка перехода в админку в шапке и нижнем
          меню публичного сайта. Если ничего не выбрано, используется набор по умолчанию.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {message && (
          <div className={message.error ? styles.toastError : styles.toastSuccess}>
            {message.text}
          </div>
        )}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Роли с видимой кнопкой «Админка»</h2>
          <p className={styles.hint}>
            Отметьте роли, для которых показывать иконку шестерёнки и переход в админку в TopBar и
            мобильной навигации.
          </p>
          <div className={styles.rolesCheckboxList}>
            {SELECTABLE_ROLES.map((roleId) => {
              const roleConfig = ROLES_CONFIG.find((r) => r.id === roleId);
              const label = roleConfig?.label ?? roleId;
              const checked = currentRoles.includes(roleId);
              return (
                <label key={roleId} className={styles.roleCheckboxLabel}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(e) => toggleRole(roleId, e.target.checked)}
                  />
                  <span>{label}</span>
                </label>
              );
            })}
          </div>
        </section>
        <div className={styles.actions}>
          <button type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/" target="_blank" rel="noreferrer" className={styles.previewLink}>
            Открыть публичку →
          </Link>
        </div>
      </form>
    </div>
  );
}
