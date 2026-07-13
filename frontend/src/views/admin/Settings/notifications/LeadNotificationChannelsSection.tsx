'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type ExternalNotifyChannelsSettings,
  getAdminExternalNotifyChannels,
  updateAdminExternalNotifyChannels,
} from '@/shared/api/admin-external-notify';
import {
  getAdminCallbackFormSettings,
  updateAdminCallbackFormSettings,
} from '@/shared/api/admin-forms-callback';
import {
  getAdminDirectorMessageSettings,
  updateAdminDirectorMessageSettings,
} from '@/shared/api/admin-forms-director';
import {
  getAdminMeasurementFormSettings,
  updateAdminMeasurementFormSettings,
} from '@/shared/api/admin-forms-measurement';
import {
  getAdminQuoteFormSettings,
  updateAdminQuoteFormSettings,
} from '@/shared/api/admin-forms-quote';
import {
  MEBEL_QUIZ_SLUG,
  REMONT_QUIZ_SLUG,
  listAdminQuizLandings,
  updateAdminQuiz,
} from '@/shared/api/admin-quiz';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';

import formStyles from '../forms/FormsSettingsSection.module.css';
import { NotifyChannelsFields, type NotifyChannelsValue } from '../forms/NotifyChannelsFields';
import styles from '../shared/SettingsPage.module.css';
import { SettingsSubPageView } from '../shared/SettingsSubPageView';
import sectionStyles from './LeadNotificationChannelsSection.module.css';

const FORM_ID = 'lead-notification-channels-form';

const EMPTY: NotifyChannelsValue = {
  notifyEmails: [],
  notifyTelegramIds: [],
  notifyMaxIds: [],
};

type ChannelKey =
  | 'callback'
  | 'measurement'
  | 'director'
  | 'quote'
  | 'quizMebel'
  | 'quizRemont'
  | 'order'
  | 'supportChat'
  | 'review'
  | 'comment'
  | 'knowledgeTraining'
  | 'knowledgeFeedback'
  | 'siteFeedback'
  | 'workDays';

type TabId = 'forms' | 'quizzes' | 'other';

interface QuizChannelsState extends NotifyChannelsValue {
  notifyPhones: string[];
}

type ChannelsState = Record<ChannelKey, NotifyChannelsValue> & {
  quizMebel: QuizChannelsState;
  quizRemont: QuizChannelsState;
};

const INITIAL: ChannelsState = {
  callback: { ...EMPTY },
  measurement: { ...EMPTY },
  director: { ...EMPTY },
  quote: { ...EMPTY },
  quizMebel: { ...EMPTY, notifyPhones: [] },
  quizRemont: { ...EMPTY, notifyPhones: [] },
  order: { ...EMPTY },
  supportChat: { ...EMPTY },
  review: { ...EMPTY },
  comment: { ...EMPTY },
  knowledgeTraining: { ...EMPTY },
  knowledgeFeedback: { ...EMPTY },
  siteFeedback: { ...EMPTY },
  workDays: { ...EMPTY },
};

const TABS: { id: TabId; label: string; hint: string }[] = [
  { id: 'forms', label: 'Формы сайта', hint: 'territory-interior.ru' },
  { id: 'quizzes', label: 'Квизы', hint: 'mebel-na-zakaz-51.ru · remont-kvartir-51.ru' },
  {
    id: 'other',
    label: 'Заказы и обратная связь',
    hint: 'Заказы, чат, отзывы, комментарии и обратная связь',
  },
];

const EVENTS_BY_TAB: Record<
  TabId,
  { key: ChannelKey; label: string; title: string; description: string; quizPhones?: boolean }[]
> = {
  forms: [
    {
      key: 'callback',
      label: 'Заказать звонок',
      title: 'Заказать звонок',
      description: 'Заявки с кнопки «Заказать звонок» на сайте.',
    },
    {
      key: 'measurement',
      label: 'Запись на замер',
      title: 'Записаться на замер',
      description: 'Заявки с формы записи на бесплатный замер.',
    },
    {
      key: 'director',
      label: 'Письмо директору',
      title: 'Письмо директору',
      description: 'Сообщения через форму «Письмо директору».',
    },
    {
      key: 'quote',
      label: 'Рассчитать стоимость',
      title: 'Рассчитать стоимость',
      description: 'Заявки с формы «Рассчитать стоимость» / «Отправить заявку».',
    },
  ],
  quizzes: [
    {
      key: 'quizMebel',
      label: 'Мебель на заказ',
      title: 'Квиз «Мебель на заказ»',
      description: 'Заявки с квиза mebel-na-zakaz-51.ru.',
      quizPhones: true,
    },
    {
      key: 'quizRemont',
      label: 'Ремонт и отделка',
      title: 'Квиз «Ремонт и отделка»',
      description: 'Заявки с квиза remont-kvartir-51.ru.',
      quizPhones: true,
    },
  ],
  other: [
    {
      key: 'order',
      label: 'Новые заказы',
      title: 'Новые заказы',
      description: 'Уведомления при отправке заказа на проверку.',
    },
    {
      key: 'supportChat',
      label: 'Чат поддержки',
      title: 'Чат поддержки',
      description: 'Сообщения от клиентов в чате поддержки на сайте.',
    },
    {
      key: 'review',
      label: 'Отзывы',
      title: 'Новые отзывы',
      description: 'Отзывы на товары, ожидающие модерации.',
    },
    {
      key: 'comment',
      label: 'Комментарии',
      title: 'Комментарии пользователей',
      description:
        'Комментарии к материалам обучающей платформы (/admin/knowledge) и другим разделам приложения.',
    },
    {
      key: 'knowledgeTraining',
      label: 'Динамика обучения',
      title: 'Динамика изучения материалов',
      description:
        'Завершение видео, текстовых материалов и успешная сдача тестов сотрудниками на обучающей платформе.',
    },
    {
      key: 'workDays',
      label: 'Учёт рабочего времени',
      title: 'Учёт рабочего времени',
      description:
        'Опоздания, ранний уход, автозакрытие рабочего дня и закрытие с указанием времени ухода.',
    },
    {
      key: 'siteFeedback',
      label: 'Обратная связь (сайт)',
      title: 'Обратная связь по сайту',
      description: 'Сообщения с публичного сайта (ошибки и предложения).',
    },
    {
      key: 'knowledgeFeedback',
      label: 'Обратная связь (обучение)',
      title: 'Обратная связь по обучающей платформе',
      description: 'Ошибки и предложения от сотрудников на платформе обучения.',
    },
  ],
};

const DEFAULT_EVENT: Record<TabId, ChannelKey> = {
  forms: 'callback',
  quizzes: 'quizMebel',
  other: 'order',
};

function pickExternal(
  settings: ExternalNotifyChannelsSettings,
  key:
    | 'order'
    | 'supportChat'
    | 'review'
    | 'comment'
    | 'knowledgeTraining'
    | 'knowledgeFeedback'
    | 'siteFeedback'
    | 'workDays'
): NotifyChannelsValue {
  switch (key) {
    case 'order':
      return {
        notifyEmails: settings.orderNotifyEmails,
        notifyTelegramIds: settings.orderNotifyTelegramIds,
        notifyMaxIds: settings.orderNotifyMaxIds,
      };
    case 'supportChat':
      return {
        notifyEmails: settings.supportNotifyEmails,
        notifyTelegramIds: settings.supportNotifyTelegramIds,
        notifyMaxIds: settings.supportNotifyMaxIds,
      };
    case 'review':
      return {
        notifyEmails: settings.reviewNotifyEmails,
        notifyTelegramIds: settings.reviewNotifyTelegramIds,
        notifyMaxIds: settings.reviewNotifyMaxIds,
      };
    case 'comment':
      return {
        notifyEmails: settings.commentNotifyEmails,
        notifyTelegramIds: settings.commentNotifyTelegramIds,
        notifyMaxIds: settings.commentNotifyMaxIds,
      };
    case 'knowledgeTraining':
      return {
        notifyEmails: settings.knowledgeTrainingNotifyEmails,
        notifyTelegramIds: settings.knowledgeTrainingNotifyTelegramIds,
        notifyMaxIds: settings.knowledgeTrainingNotifyMaxIds,
      };
    case 'workDays':
      return {
        notifyEmails: settings.workDayNotifyEmails,
        notifyTelegramIds: settings.workDayNotifyTelegramIds,
        notifyMaxIds: settings.workDayNotifyMaxIds,
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

function buildExternalPatch(channels: ChannelsState) {
  return {
    orderNotifyEmails: channels.order.notifyEmails,
    orderNotifyTelegramIds: channels.order.notifyTelegramIds,
    orderNotifyMaxIds: channels.order.notifyMaxIds,
    supportNotifyEmails: channels.supportChat.notifyEmails,
    supportNotifyTelegramIds: channels.supportChat.notifyTelegramIds,
    supportNotifyMaxIds: channels.supportChat.notifyMaxIds,
    reviewNotifyEmails: channels.review.notifyEmails,
    reviewNotifyTelegramIds: channels.review.notifyTelegramIds,
    reviewNotifyMaxIds: channels.review.notifyMaxIds,
    commentNotifyEmails: channels.comment.notifyEmails,
    commentNotifyTelegramIds: channels.comment.notifyTelegramIds,
    commentNotifyMaxIds: channels.comment.notifyMaxIds,
    knowledgeTrainingNotifyEmails: channels.knowledgeTraining.notifyEmails,
    knowledgeTrainingNotifyTelegramIds: channels.knowledgeTraining.notifyTelegramIds,
    knowledgeTrainingNotifyMaxIds: channels.knowledgeTraining.notifyMaxIds,
    workDayNotifyEmails: channels.workDays.notifyEmails,
    workDayNotifyTelegramIds: channels.workDays.notifyTelegramIds,
    workDayNotifyMaxIds: channels.workDays.notifyMaxIds,
    knowledgeFeedbackNotifyEmails: channels.knowledgeFeedback.notifyEmails,
    knowledgeFeedbackNotifyTelegramIds: channels.knowledgeFeedback.notifyTelegramIds,
    knowledgeFeedbackNotifyMaxIds: channels.knowledgeFeedback.notifyMaxIds,
    siteFeedbackNotifyEmails: channels.siteFeedback.notifyEmails,
    siteFeedbackNotifyTelegramIds: channels.siteFeedback.notifyTelegramIds,
    siteFeedbackNotifyMaxIds: channels.siteFeedback.notifyMaxIds,
  };
}

export function LeadNotificationChannelsSection() {
  const { getAuthHeaders } = useAuth();
  const [channels, setChannels] = useState<ChannelsState>(INITIAL);
  const [quizAvailable, setQuizAvailable] = useState({ quizMebel: false, quizRemont: false });
  const [activeTab, setActiveTab] = useState<TabId>('forms');
  const [activeEvent, setActiveEvent] = useState<ChannelKey>(DEFAULT_EVENT.forms);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const tabEvents = EVENTS_BY_TAB[activeTab];
  const currentEvent = useMemo(
    () => tabEvents.find((e) => e.key === activeEvent) ?? tabEvents[0],
    [tabEvents, activeEvent]
  );

  const fetchSettings = useCallback(async () => {
    try {
      const [callback, measurement, director, quote, external, quizLandings] = await Promise.all([
        getAdminCallbackFormSettings(getAuthHeaders),
        getAdminMeasurementFormSettings(getAuthHeaders),
        getAdminDirectorMessageSettings(getAuthHeaders),
        getAdminQuoteFormSettings(getAuthHeaders),
        getAdminExternalNotifyChannels(),
        listAdminQuizLandings(getAuthHeaders),
      ]);

      const quizBySlug = Object.fromEntries(quizLandings.map((quiz) => [quiz.slug, quiz]));
      const quizMebel = quizBySlug[MEBEL_QUIZ_SLUG] ?? null;
      const quizRemont = quizBySlug[REMONT_QUIZ_SLUG] ?? null;

      setQuizAvailable({
        quizMebel: quizMebel != null,
        quizRemont: quizRemont != null,
      });

      setChannels({
        callback: {
          notifyEmails: callback.notifyEmails ?? [],
          notifyTelegramIds: callback.notifyTelegramIds ?? [],
          notifyMaxIds: callback.notifyMaxIds ?? [],
        },
        measurement: {
          notifyEmails: measurement.notifyEmails ?? [],
          notifyTelegramIds: measurement.notifyTelegramIds ?? [],
          notifyMaxIds: measurement.notifyMaxIds ?? [],
        },
        director: {
          notifyEmails: director.notifyEmails ?? [],
          notifyTelegramIds: director.notifyTelegramIds ?? [],
          notifyMaxIds: director.notifyMaxIds ?? [],
        },
        quote: {
          notifyEmails: quote.notifyEmails ?? [],
          notifyTelegramIds: quote.notifyTelegramIds ?? [],
          notifyMaxIds: quote.notifyMaxIds ?? [],
        },
        quizMebel: {
          notifyEmails: quizMebel?.notifyEmails ?? [],
          notifyTelegramIds: quizMebel?.notifyTelegramIds ?? [],
          notifyMaxIds: quizMebel?.notifyMaxIds ?? [],
          notifyPhones: quizMebel?.notifyPhones ?? [],
        },
        quizRemont: {
          notifyEmails: quizRemont?.notifyEmails ?? [],
          notifyTelegramIds: quizRemont?.notifyTelegramIds ?? [],
          notifyMaxIds: quizRemont?.notifyMaxIds ?? [],
          notifyPhones: quizRemont?.notifyPhones ?? [],
        },
        order: pickExternal(external, 'order'),
        supportChat: pickExternal(external, 'supportChat'),
        review: pickExternal(external, 'review'),
        comment: pickExternal(external, 'comment'),
        knowledgeTraining: pickExternal(external, 'knowledgeTraining'),
        knowledgeFeedback: pickExternal(external, 'knowledgeFeedback'),
        siteFeedback: pickExternal(external, 'siteFeedback'),
        workDays: pickExternal(external, 'workDays'),
      });
    } catch (err) {
      console.error('Failed to fetch notification channels:', err);
      showSaveError('Не удалось загрузить настройки');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, showSaveError]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleTabChange = (tabId: TabId) => {
    setActiveTab(tabId);
    setActiveEvent(DEFAULT_EVENT[tabId]);
  };

  const setChannel = (key: ChannelKey, value: NotifyChannelsValue) => {
    setChannels((prev) => ({ ...prev, [key]: value }));
  };

  const setQuizPhones = (key: 'quizMebel' | 'quizRemont', phones: string[]) => {
    setChannels((prev) => ({
      ...prev,
      [key]: { ...prev[key], notifyPhones: phones },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      const saves: Promise<unknown>[] = [
        updateAdminCallbackFormSettings(channels.callback, getAuthHeaders),
        updateAdminMeasurementFormSettings(channels.measurement, getAuthHeaders),
        updateAdminDirectorMessageSettings(channels.director, getAuthHeaders),
        updateAdminQuoteFormSettings(
          {
            notifyEmails: channels.quote.notifyEmails,
            notifyTelegramIds: channels.quote.notifyTelegramIds,
            notifyMaxIds: channels.quote.notifyMaxIds,
          },
          getAuthHeaders
        ),
        updateAdminExternalNotifyChannels(buildExternalPatch(channels)),
      ];

      if (quizAvailable.quizMebel) {
        saves.push(
          updateAdminQuiz(
            MEBEL_QUIZ_SLUG,
            {
              notifyEmails: channels.quizMebel.notifyEmails,
              notifyTelegramIds: channels.quizMebel.notifyTelegramIds,
              notifyMaxIds: channels.quizMebel.notifyMaxIds,
              notifyPhones: channels.quizMebel.notifyPhones,
            },
            getAuthHeaders
          )
        );
      }
      if (quizAvailable.quizRemont) {
        saves.push(
          updateAdminQuiz(
            REMONT_QUIZ_SLUG,
            {
              notifyEmails: channels.quizRemont.notifyEmails,
              notifyTelegramIds: channels.quizRemont.notifyTelegramIds,
              notifyMaxIds: channels.quizRemont.notifyMaxIds,
              notifyPhones: channels.quizRemont.notifyPhones,
            },
            getAuthHeaders
          )
        );
      }

      await Promise.all(saves);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const renderEventPanel = () => {
    if (!currentEvent) return null;

    const isQuiz = currentEvent.key === 'quizMebel' || currentEvent.key === 'quizRemont';
    const quizMissing = isQuiz && !quizAvailable[currentEvent.key as 'quizMebel' | 'quizRemont'];

    return (
      <div className={sectionStyles.tabPanel}>
        <div className={sectionStyles.panelHeader}>
          <h3 className={sectionStyles.panelTitle}>{currentEvent.title}</h3>
          <p className={sectionStyles.panelDescription}>{currentEvent.description}</p>
        </div>

        {quizMissing ? (
          <p className={sectionStyles.quizMissing}>
            Квиз не найден в базе данных. Локально выполните:{' '}
            <code>npm run prisma:seed-quizzes</code> в папке backend (только квизы).
          </p>
        ) : (
          <>
            <NotifyChannelsFields
              idPrefix={currentEvent.key}
              value={channels[currentEvent.key]}
              onChange={(value) => setChannel(currentEvent.key, value)}
            />
            {currentEvent.quizPhones ? (
              <div className={formStyles.formGroup}>
                <label htmlFor={`${currentEvent.key}-phones`} className={formStyles.formLabel}>
                  Телефоны менеджеров (в тексте уведомления)
                </label>
                <textarea
                  id={`${currentEvent.key}-phones`}
                  value={(
                    channels[currentEvent.key as 'quizMebel' | 'quizRemont'] as QuizChannelsState
                  ).notifyPhones.join('\n')}
                  onChange={(e) =>
                    setQuizPhones(
                      currentEvent.key as 'quizMebel' | 'quizRemont',
                      e.target.value
                        .split('\n')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  rows={2}
                  className={formStyles.formTextarea}
                />
              </div>
            ) : null}
          </>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <SettingsSubPageView
        title="Каналы уведомлений о заявках"
        subtitle="Email, Telegram и MAX для всех типов заявок: формы, квизы, заказы, чат, отзывы, комментарии, обучение и обратная связь."
        headerActions={
          <button type="button" disabled className={formStyles.submitButton}>
            Сохранить все каналы
          </button>
        }
      >
        <p className={styles.sectionDescription}>Загрузка каналов уведомлений...</p>
      </SettingsSubPageView>
    );
  }

  const activeTabMeta = TABS.find((t) => t.id === activeTab);

  return (
    <SettingsSubPageView
      title="Каналы уведомлений о заявках"
      subtitle="Email, Telegram и MAX для всех типов заявок: формы, квизы, заказы, чат, отзывы, комментарии, обучение и обратная связь."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form={FORM_ID}
          disabled={saving}
          className={formStyles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить все каналы'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={sectionStyles.envHint}>
        Для Telegram и MAX укажите токены ботов на сервере: <code>TELEGRAM_BOT_TOKEN</code>,{' '}
        <code>MAX_BOT_TOKEN</code>. Email отправляется через SMTP (<code>SMTP_*</code>,{' '}
        <code>MAIL_FROM</code>).
      </p>

      <form id={FORM_ID} onSubmit={handleSave} className={sectionStyles.form}>
        <div className={sectionStyles.tabShell}>
          <div className={sectionStyles.tabBar} role="tablist" aria-label="Категории заявок">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`${sectionStyles.tab} ${activeTab === tab.id ? sectionStyles.tabActive : ''}`}
                onClick={() => handleTabChange(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {tabEvents.length > 1 ? (
            <div
              className={sectionStyles.subTabBar}
              role="tablist"
              aria-label={`Тип заявки: ${activeTabMeta?.label ?? ''}`}
            >
              {tabEvents.map((event) => (
                <button
                  key={event.key}
                  type="button"
                  role="tab"
                  aria-selected={activeEvent === event.key}
                  className={`${sectionStyles.subTab} ${activeEvent === event.key ? sectionStyles.subTabActive : ''}`}
                  onClick={() => setActiveEvent(event.key)}
                >
                  {event.label}
                </button>
              ))}
            </div>
          ) : null}

          {renderEventPanel()}
        </div>
      </form>
    </SettingsSubPageView>
  );
}
