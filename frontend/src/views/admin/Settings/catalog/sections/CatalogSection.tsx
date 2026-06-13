'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import type { CatalogBlockSettings } from '@/shared/api/admin-catalog-block';
import {
  getAdminCatalogBlockSettings,
  updateAdminCatalogBlockSettings,
} from '@/shared/api/admin-catalog-block';

import actionStyles from '../../shared/SettingsActions.module.css';
import styles from '../../user-cabinet/UserCabinetSection.module.css';

export function CatalogSection() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<CatalogBlockSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getAdminCatalogBlockSettings();
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
      await updateAdminCatalogBlockSettings({
        defaultMobileCatalogColumns: settings.defaultMobileCatalogColumns,
      });
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
          Настройки каталога доступны только супер-администратору.
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
        <h2 className={styles.sectionTitle}>Каталог: режим просмотра на мобильном</h2>
        <p className={styles.sectionDescription}>
          Режим по умолчанию для всех пользователей на мобильных устройствах. Пользователи могут
          изменить его в личном кабинете в настройках уведомлений.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>}
          <div className={actionStyles.fieldGroup}>
            <label htmlFor="defaultMobileCatalogColumns" className={actionStyles.fieldLabel}>
              Карточек в строке по умолчанию
            </label>
            <select
              id="defaultMobileCatalogColumns"
              value={settings.defaultMobileCatalogColumns}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, defaultMobileCatalogColumns: Number(e.target.value) as 1 | 2 } : s
                )
              }
              className={actionStyles.fieldSelect}
            >
              <option value={1}>1 карточка в строке</option>
              <option value={2}>2 карточки в строке</option>
            </select>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
