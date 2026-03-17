'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminDirectorMessageSettings,
  updateAdminDirectorMessageSettings,
} from '@/shared/api/admin-forms-director';

import styles from './SettingsPage.module.css';

export function DirectorMessageSection() {
  const { getAuthHeaders } = useAuth();
  const [directorEmail, setDirectorEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getAdminDirectorMessageSettings(getAuthHeaders);
      setDirectorEmail(data.directorEmail ?? '');
    } catch (err) {
      console.error('Failed to fetch director message settings:', err);
      showToast('Не удалось загрузить настройки', 'error');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      await updateAdminDirectorMessageSettings(
        { directorEmail: directorEmail.trim() || null },
        getAuthHeaders
      );
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <p className={styles.sectionDescription}>Загрузка настроек...</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Письмо директору</h2>
      <p className={styles.sectionDescription}>
        Укажите email директора, на который будут приходить письма из формы «Письмо директору» в
        публичной части сайта. Кнопка открытия формы находится в футере и в других местах сайта.
        Если email не указан, форма будет возвращать ошибку при отправке.
      </p>
      <p className={styles.sectionDescription} style={{ marginTop: -8 }}>
        Письма с форм также сохраняются в разделе{' '}
        <Link href="/admin/forms?type=director" className={styles.infoBlockLink}>
          Заявки с форм
        </Link>
        .
      </p>

      <form onSubmit={handleSave} className={styles.form} style={{ maxWidth: 480 }}>
        {toast && (
          <div
            className={`${styles.infoBlock}`}
            style={{
              marginBottom: 16,
              backgroundColor:
                toast.type === 'success' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: toast.type === 'success' ? '#059669' : '#ef4444',
            }}
          >
            {toast.message}
          </div>
        )}
        <div className={styles.formGroup} style={{ marginBottom: 16 }}>
          <label
            htmlFor="directorEmail"
            className={styles.templateCheckboxLabel}
            style={{ marginBottom: 8 }}
          >
            Email директора
          </label>
          <input
            id="directorEmail"
            type="email"
            value={directorEmail}
            onChange={(e) => setDirectorEmail(e.target.value)}
            placeholder="director@company.ru"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.9375rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: '8px 16px',
            backgroundColor: '#d90652',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: saving ? 'not-allowed' : 'pointer',
            fontSize: '0.875rem',
          }}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </section>
  );
}
