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
  const [recipientEmail, setRecipientEmail] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
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
      setTelegramChatId(data.telegramChatId ?? '');
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
          telegramChatId: telegramChatId.trim() || null,
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
        Укажите каналы уведомлений: email и/или Telegram (ID чата). Для Telegram добавьте
        TELEGRAM_BOT_TOKEN в .env.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Укажите виды работ и товаров для выбора в форме — каждая строка станет отдельным чекбоксом.
        Пользователь также может написать свой вариант.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Заявки также сохраняются в разделе{' '}
        <Link href="/admin/forms?type=quote" className={styles.infoBlockLink}>
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
          <label
            htmlFor="recipientEmail"
            className={`${styles.templateCheckboxLabel} ${formStyles.formLabel}`}
          >
            Email для уведомлений
          </label>
          <input
            id="recipientEmail"
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="manager@company.ru"
            className={formStyles.formInput}
          />
        </div>
        <div className={formStyles.formGroup}>
          <label
            htmlFor="telegramChatId"
            className={`${styles.templateCheckboxLabel} ${formStyles.formLabel}`}
          >
            ID чата Telegram
          </label>
          <input
            id="telegramChatId"
            type="text"
            value={telegramChatId}
            onChange={(e) => setTelegramChatId(e.target.value)}
            placeholder="-1001234567890 или 123456789"
            className={formStyles.formInput}
          />
        </div>
        <div className={formStyles.formGroup}>
          <label
            htmlFor="serviceTypeOptions"
            className={`${styles.templateCheckboxLabel} ${formStyles.formLabel}`}
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
            className={formStyles.formTextarea}
          />
        </div>
        <button type="submit" disabled={saving} className={formStyles.submitButton}>
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>
    </section>
  );
}
