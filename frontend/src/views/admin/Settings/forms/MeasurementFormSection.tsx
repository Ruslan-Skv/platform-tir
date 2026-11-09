'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminMeasurementFormSettings,
  updateAdminMeasurementFormSettings,
} from '@/shared/api/admin-forms-measurement';

import styles from '../shared/SettingsPage.module.css';
import formStyles from './FormsSettingsSection.module.css';

export function MeasurementFormSection() {
  const { getAuthHeaders } = useAuth();
  const [productTypeOptions, setProductTypeOptions] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getAdminMeasurementFormSettings(getAuthHeaders);
      setProductTypeOptions((data.productTypeOptions ?? []).join('\n'));
    } catch (err) {
      console.error('Failed to fetch measurement form settings:', err);
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
    const options = productTypeOptions
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await updateAdminMeasurementFormSettings({ productTypeOptions: options }, getAuthHeaders);
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
      <h2 className={styles.sectionTitle}>Позиции «Интересующий товар»</h2>
      <p className={styles.sectionDescription}>
        Каждая строка станет отдельным пунктом выпадающего списка «Интересующий товар» в форме
        «Запись на бесплатный замер». Если список пуст, используется стандартный набор позиций.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Каналы уведомлений (email, Telegram, MAX) — в разделе{' '}
        <Link href="/admin/settings/notification-channels" className={styles.infoBlockLink}>
          Каналы уведомлений о заявках
        </Link>
        . Заявки сохраняются в{' '}
        <Link href="/admin/leads?source=form_measurement" className={styles.infoBlockLink}>
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
          <label htmlFor="productTypeOptions" className={formStyles.formLabel}>
            Позиции «Интересующий товар» (каждая строка — отдельный пункт списка)
          </label>
          <textarea
            id="productTypeOptions"
            value={productTypeOptions}
            onChange={(e) => setProductTypeOptions(e.target.value)}
            placeholder={'Межкомнатные двери\nВходные двери\nОкна\nРемонт квартиры'}
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
