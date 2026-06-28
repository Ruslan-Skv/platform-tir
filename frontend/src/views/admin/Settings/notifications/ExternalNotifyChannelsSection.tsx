'use client';

import React, { useCallback, useEffect, useState } from 'react';

import {
  type ExternalNotifyChannelsSettings,
  getAdminExternalNotifyChannels,
  updateAdminExternalNotifyChannels,
} from '@/shared/api/admin-external-notify';

import formStyles from '../forms/FormsSettingsSection.module.css';
import { NotifyChannelsFields, type NotifyChannelsValue } from '../forms/NotifyChannelsFields';
import styles from '../shared/SettingsPage.module.css';
import sectionStyles from './ExternalNotifyChannelsSection.module.css';

const EMPTY: NotifyChannelsValue = {
  notifyEmails: [],
  notifyTelegramIds: [],
  notifyMaxIds: [],
};

type EventKey = 'order' | 'knowledgeFeedback' | 'siteFeedback';

const EVENTS: { key: EventKey; title: string; description: string }[] = [
  {
    key: 'order',
    title: 'Новые заказы',
    description: 'Уведомления при отправке заказа на проверку.',
  },
  {
    key: 'knowledgeFeedback',
    title: 'Обратная связь по обучающей платформе',
    description: 'Ошибки и предложения от сотрудников на платформе обучения.',
  },
  {
    key: 'siteFeedback',
    title: 'Обратная связь по сайту',
    description: 'Сообщения с публичного сайта territory-interior.ru.',
  },
];

function pickChannels(
  settings: ExternalNotifyChannelsSettings,
  key: EventKey
): NotifyChannelsValue {
  switch (key) {
    case 'order':
      return {
        notifyEmails: settings.orderNotifyEmails,
        notifyTelegramIds: settings.orderNotifyTelegramIds,
        notifyMaxIds: settings.orderNotifyMaxIds,
      };
    case 'knowledgeFeedback':
      return {
        notifyEmails: settings.knowledgeFeedbackNotifyEmails,
        notifyTelegramIds: settings.knowledgeFeedbackNotifyTelegramIds,
        notifyMaxIds: settings.knowledgeFeedbackNotifyMaxIds,
      };
    case 'siteFeedback':
      return {
        notifyEmails: settings.siteFeedbackNotifyEmails,
        notifyTelegramIds: settings.siteFeedbackNotifyTelegramIds,
        notifyMaxIds: settings.siteFeedbackNotifyMaxIds,
      };
  }
}

function buildPatch(key: EventKey, value: NotifyChannelsValue) {
  switch (key) {
    case 'order':
      return {
        orderNotifyEmails: value.notifyEmails,
        orderNotifyTelegramIds: value.notifyTelegramIds,
        orderNotifyMaxIds: value.notifyMaxIds,
      };
    case 'knowledgeFeedback':
      return {
        knowledgeFeedbackNotifyEmails: value.notifyEmails,
        knowledgeFeedbackNotifyTelegramIds: value.notifyTelegramIds,
        knowledgeFeedbackNotifyMaxIds: value.notifyMaxIds,
      };
    case 'siteFeedback':
      return {
        siteFeedbackNotifyEmails: value.notifyEmails,
        siteFeedbackNotifyTelegramIds: value.notifyTelegramIds,
        siteFeedbackNotifyMaxIds: value.notifyMaxIds,
      };
  }
}

export function ExternalNotifyChannelsSection() {
  const [settings, setSettings] = useState<ExternalNotifyChannelsSettings | null>(null);
  const [channels, setChannels] = useState<Record<EventKey, NotifyChannelsValue>>({
    order: EMPTY,
    knowledgeFeedback: EMPTY,
    siteFeedback: EMPTY,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const data = await getAdminExternalNotifyChannels();
      setSettings(data);
      setChannels({
        order: pickChannels(data, 'order'),
        knowledgeFeedback: pickChannels(data, 'knowledgeFeedback'),
        siteFeedback: pickChannels(data, 'siteFeedback'),
      });
    } catch (err) {
      console.error('Failed to fetch external notify channels:', err);
      showToast('Не удалось загрузить настройки', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        ...buildPatch('order', channels.order),
        ...buildPatch('knowledgeFeedback', channels.knowledgeFeedback),
        ...buildPatch('siteFeedback', channels.siteFeedback),
      };
      const updated = await updateAdminExternalNotifyChannels(payload);
      setSettings(updated);
      showToast('Каналы уведомлений сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <section className={styles.section}>
        <p className={styles.sectionDescription}>Загрузка каналов уведомлений...</p>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Email, Telegram и MAX</h2>
      <p className={styles.sectionDescription}>
        Внешние каналы для заказов и обратной связи. Для форм сайта и квизов настройки находятся в
        соответствующих разделах настроек и админки квизов.
      </p>
      <p className={`${styles.sectionDescription} ${formStyles.sectionDescriptionTight}`}>
        Пуш-уведомления в браузере и PWA настраиваются ниже на этой странице.
      </p>

      <form onSubmit={handleSave} className={sectionStyles.form}>
        {toast && (
          <div
            className={`${styles.infoBlock} ${formStyles.toast} ${
              toast.type === 'success' ? formStyles.toastSuccess : formStyles.toastError
            }`}
          >
            {toast.message}
          </div>
        )}

        {EVENTS.map((event) => (
          <div key={event.key} className={sectionStyles.eventBlock}>
            <h3 className={sectionStyles.eventTitle}>{event.title}</h3>
            <p className={sectionStyles.eventDescription}>{event.description}</p>
            <NotifyChannelsFields
              idPrefix={event.key}
              value={channels[event.key]}
              onChange={(value) =>
                setChannels((prev) => ({
                  ...prev,
                  [event.key]: value,
                }))
              }
            />
          </div>
        ))}

        {settings?.updatedAt ? (
          <p className={sectionStyles.updatedAt}>
            Обновлено: {new Date(settings.updatedAt).toLocaleString('ru-RU')}
          </p>
        ) : null}

        <button
          data-admin-mutation
          type="submit"
          disabled={saving}
          className={formStyles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить каналы'}
        </button>
      </form>
    </section>
  );
}
