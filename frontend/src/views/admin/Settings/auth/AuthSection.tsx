'use client';

import React, { useCallback, useEffect, useState } from 'react';

import type { AdminAuthSettings } from '@/shared/api/admin-auth-settings';
import { getAdminAuthSettings, updateAdminAuthSettings } from '@/shared/api/admin-auth-settings';

import styles from './AuthSection.module.css';

export function AuthSection() {
  const [settings, setSettings] = useState<AdminAuthSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAdminAuthSettings()
      .then((data) => {
        if (!cancelled) setSettings(data);
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      const updated = await updateAdminAuthSettings({
        sberAuthEnabled: settings.sberAuthEnabled,
      });
      setSettings(updated);
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

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
        <h2 className={styles.sectionTitle}>Способы входа</h2>
        <p className={styles.sectionDescription}>
          Управление внешними способами входа в личный кабинет сайта.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="sberAuthEnabled"
              checked={settings.sberAuthEnabled}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, sberAuthEnabled: e.target.checked } : s))
              }
            />
            <label htmlFor="sberAuthEnabled">Вход через Сбер ID</label>
          </div>
          <p className={styles.hint}>
            Если выключить, кнопка «Войти по Сбер ID» исчезнет со страницы входа, а запросы к Сбер
            ID будут отклоняться. Вход по email/паролю и через Яндекс ID не затрагивается.
          </p>
          <button data-admin-mutation type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </section>

      {toast && (
        <div
          className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}
          role="alert"
        >
          <span className={styles.toastIcon}>{toast.type === 'success' ? '✓' : '⚠'}</span>
          <span className={styles.toastMessage}>{toast.message}</span>
          <button
            type="button"
            className={styles.toastClose}
            onClick={() => setToast(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
