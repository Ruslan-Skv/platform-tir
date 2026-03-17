'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminQuoteFormSettings,
  updateAdminQuoteFormSettings,
} from '@/shared/api/admin-forms-quote';

import styles from './SettingsPage.module.css';

export function QuoteFormSection() {
  const { getAuthHeaders } = useAuth();
  const [recipientEmail, setRecipientEmail] = useState('');
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
      setRecipientEmail(data.recipientEmail ?? '');
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
      await updateAdminQuoteFormSettings(
        {
          recipientEmail: recipientEmail.trim() || null,
          serviceTypeOptions: options,
        },
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
      <h2 className={styles.sectionTitle}>Рассчитать стоимость</h2>
      <p className={styles.sectionDescription}>
        Укажите email, на который будут приходить письма при отправке заявки через форму «Рассчитать
        стоимость» (кнопка на главной) и «Отправить заявку». Если email не указан, заявки
        сохраняются только в базе данных.
      </p>
      <p className={styles.sectionDescription} style={{ marginTop: -8 }}>
        Укажите виды работ и товаров для выбора в форме — каждая строка станет отдельным чекбоксом.
        Пользователь также может написать свой вариант.
      </p>
      <p className={styles.sectionDescription} style={{ marginTop: -8 }}>
        Заявки также сохраняются в разделе{' '}
        <Link href="/admin/forms?type=quote" className={styles.infoBlockLink}>
          Заявки с форм
        </Link>
        .
      </p>

      <form onSubmit={handleSave} className={styles.form} style={{ maxWidth: 560 }}>
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
            htmlFor="recipientEmail"
            className={styles.templateCheckboxLabel}
            style={{ marginBottom: 8 }}
          >
            Email для уведомлений
          </label>
          <input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="manager@company.ru"
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.9375rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
            }}
          />
        </div>
        <div className={styles.formGroup} style={{ marginBottom: 16 }}>
          <label
            htmlFor="serviceTypeOptions"
            className={styles.templateCheckboxLabel}
            style={{ marginBottom: 8 }}
          >
            Виды работ и товаров (каждая строка — отдельный чекбокс)
          </label>
          <textarea
            id="serviceTypeOptions"
            value={serviceTypeOptions}
            onChange={(e) => setServiceTypeOptions(e.target.value)}
            placeholder="Межкомнатные двери
Входные двери
Окна
Потолки
Жалюзи
Мебель
Ремонт квартир"
            rows={8}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '0.9375rem',
              border: '1px solid #d1d5db',
              borderRadius: 6,
              resize: 'vertical',
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
