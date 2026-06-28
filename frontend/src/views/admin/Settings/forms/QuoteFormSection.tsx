'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminQuoteFormSettings,
  updateAdminQuoteFormSettings,
} from '@/shared/api/admin-forms-quote';

import styles from '../shared/SettingsPage.module.css';
import formStyles from './FormsSettingsSection.module.css';

export function QuoteFormSection() {
  const { getAuthHeaders } = useAuth();
  const [serviceTypeOptions, setServiceTypeOptions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getAdminQuoteFormSettings(getAuthHeaders);
      setServiceTypeOptions((data.serviceTypeOptions ?? []).join('\n'));
    } catch (err) {
      console.error('Failed to fetch quote form settings:', err);
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
    const options = serviceTypeOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await updateAdminQuoteFormSettings({ serviceTypeOptions: options }, getAuthHeaders);
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
      <h2 className={styles.sectionTitle}>Виды работ и товаров</h2>
      <p className={styles.sectionDescription}>
        Каждая строка станет отдельным чекбоксом в форме «Рассчитать стоимость». Пользователь также
        может написать свой вариант.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Каналы уведомлений (email, Telegram, MAX) — в разделе{' '}
        <Link href="/admin/settings/notification-channels" className={styles.infoBlockLink}>
          Каналы уведомлений о заявках
        </Link>
        . Заявки сохраняются в{' '}
        <Link href="/admin/leads?source=form_quote" className={styles.infoBlockLink}>
          Заявки с форм
        </Link>
        .
      </p>

      <form onSubmit={handleSave} className={formStyles.formWide}>
        {toast && (
          <div
            className={`${styles.infoBlock} ${formStyles.toast} ${
              toast.type === 'success' ? formStyles.toastSuccess : formStyles.toastError
            }`}
          >
            {toast.message}
          </div>
        )}
        <div className={formStyles.formGroup}>
          <label htmlFor="serviceTypeOptions" className={formStyles.formLabel}>
            Виды работ и товаров (каждая строка — отдельный чекбокс)
          </label>
          <textarea
            id="serviceTypeOptions"
            value={serviceTypeOptions}
            onChange={(e) => setServiceTypeOptions(e.target.value)}
            placeholder={'Межкомнатные двери\nВходные двери\nОкна'}
            rows={8}
            className={formStyles.formTextarea}
          />
        </div>
        <button
          data-admin-mutation
          type="submit"
          disabled={saving}
          className={formStyles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </section>
  );
}
