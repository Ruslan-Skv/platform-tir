'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminSitePublicSettings,
  updateAdminSitePublicSettings,
} from '@/shared/api/admin-site-public';
import { parseRolesShowAdminLinkFromApi } from '@/shared/lib/site-public-admin-link';
import { ROLES_CONFIG } from '@/views/admin/Settings';

import styles from './AdminLinkSettingsPage.module.css';

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

type Channel = 'desktop' | 'mobile';

export function AdminLinkSettingsPageView() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<{
    desktopRoles: string[] | null;
    mobileRoles: string[] | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminSitePublicSettings();
      const parsed = parseRolesShowAdminLinkFromApi(data.rolesShowAdminLink);
      setSettings({
        desktopRoles: parsed.desktop,
        mobileRoles: parsed.mobile,
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

  const toggleRole = (channel: Channel, roleId: string, checked: boolean) => {
    if (!settings) return;
    const key = channel === 'desktop' ? 'desktopRoles' : 'mobileRoles';
    const current = settings[key] ?? DEFAULT_ROLES;
    const next = checked ? [...current, roleId] : current.filter((r) => r !== roleId);
    setSettings({
      ...settings,
      [key]: next.length > 0 ? next : null,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const { desktopRoles, mobileRoles } = settings;
      if (desktopRoles === null && mobileRoles === null) {
        await updateAdminSitePublicSettings({ rolesShowAdminLinkByDevice: null });
      } else {
        await updateAdminSitePublicSettings({
          rolesShowAdminLinkByDevice: {
            desktop: desktopRoles,
            mobile: mobileRoles,
          },
        });
      }
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

  const currentDesktop = settings.desktopRoles ?? DEFAULT_ROLES;
  const currentMobile = settings.mobileRoles ?? DEFAULT_ROLES;

  const renderRoleCheckboxes = (channel: Channel, currentRoles: string[]) => (
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
              onChange={(e) => toggleRole(channel, roleId, e.target.checked)}
            />
            <span>{label}</span>
          </label>
        );
      })}
    </div>
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Кнопка «Админка» на публичном сайте</h1>
        <p className={styles.subtitle}>
          Для широкого экрана (шапка TopBar, ширина больше 768px) и для телефона (нижняя навигация,
          не больше 768px) можно задать разные наборы ролей. Если в блоке снять все галочки и
          сохранить, для этого варианта используется встроенный минимальный набор (как при пустой
          настройке в базе).
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {message && (
          <div className={message.error ? styles.toastError : styles.toastSuccess}>
            {message.text}
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Десктоп и планшет (шапка)</h2>
          <p className={styles.hint}>
            Иконка шестерёнки в верхней панели, когда видна шапка TopBar (ширина экрана больше
            768px).
          </p>
          {renderRoleCheckboxes('desktop', currentDesktop)}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Мобильный телефон</h2>
          <p className={styles.hint}>
            Пункт «Админка» в нижней фиксированной навигации при ширине экрана не больше 768px.
          </p>
          {renderRoleCheckboxes('mobile', currentMobile)}
        </section>

        <div className={styles.actions}>
          <button data-admin-mutation type="submit" className={styles.saveButton} disabled={saving}>
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
