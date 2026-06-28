'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminDirectorMessageSettings,
  updateAdminDirectorMessageSettings,
} from '@/shared/api/admin-forms-director';

import styles from '../shared/SettingsPage.module.css';
import formStyles from './FormsSettingsSection.module.css';
import { NotifyChannelsFields, type NotifyChannelsValue } from './NotifyChannelsFields';

const EMPTY_CHANNELS: NotifyChannelsValue = {
  notifyEmails: [],
  notifyTelegramIds: [],
  notifyMaxIds: [],
};

export function DirectorMessageSection() {
  const { getAuthHeaders } = useAuth();
  const [channels, setChannels] = useState<NotifyChannelsValue>(EMPTY_CHANNELS);
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
      setChannels({
        notifyEmails: data.notifyEmails ?? [],
        notifyTelegramIds: data.notifyTelegramIds ?? [],
        notifyMaxIds: data.notifyMaxIds ?? [],
      });
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
      await updateAdminDirectorMessageSettings(channels, getAuthHeaders);
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
        Укажите каналы уведомлений: email, Telegram и/или MAX. Нужен хотя бы один настроенный канал,
        иначе форма будет недоступна посетителям.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Письма с форм также сохраняются в разделе{' '}
        <Link href="/admin/forms?type=director" className={styles.infoBlockLink}>
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
        <NotifyChannelsFields idPrefix="director" value={channels} onChange={setChannels} />
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
