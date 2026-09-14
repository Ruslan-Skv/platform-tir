'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type AdminNotificationsSettings,
  type MyNotifyEventKey,
  deleteAdminNotificationSound,
  getAdminNotificationSounds,
  getAdminNotificationsSettings,
  resetMyAdminNotificationSettings,
  updateMyAdminNotificationDeliveryPrefs,
  uploadAdminNotificationSound,
} from '@/shared/api/admin-notifications';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';
import cdBase from '@/views/admin/ContractDocuments/styles/base.module.css';
import cdHub from '@/views/admin/ContractDocuments/styles/contracts-list-hub.module.css';
import cdChrome from '@/views/admin/ContractDocuments/styles/editor-chrome.module.css';

import styles from './MyNotificationsPage.module.css';
import { MyNotificationsRulesInfoTip } from './MyNotificationsRulesInfoTip';

const SOUND_OPTIONS: { value: NotificationSoundType; label: string }[] = [
  { value: 'beep', label: 'Beep (короткий)' },
  { value: 'ding', label: 'Ding (звонок)' },
  { value: 'chime', label: 'Chime (перелив)' },
  { value: 'bell', label: 'Bell (колокольчик)' },
  { value: 'custom', label: 'Свой звук (загруженный)' },
];

type EventToggle = {
  key: MyNotifyEventKey;
  label: string;
  superAdminOnly?: boolean;
};

const EVENT_TOGGLES: EventToggle[] = [
  { key: 'notifyOnReviews', label: 'Новые отзывы на товары' },
  { key: 'notifyOnOrders', label: 'Новые заказы' },
  { key: 'notifyOnSupportChat', label: 'Сообщения в чате поддержки' },
  { key: 'notifyOnMeasurementForm', label: 'Запись на замер' },
  { key: 'notifyOnCallbackForm', label: 'Заказ обратного звонка' },
  { key: 'notifyOnDirectorForm', label: 'Письмо директору' },
  { key: 'notifyOnQuoteForm', label: 'Рассчитать стоимость' },
  { key: 'notifyOnQuizMebel', label: 'Квиз — Мебель на заказ (mebel-na-zakaz-51.ru)' },
  { key: 'notifyOnQuizRemont', label: 'Квиз — Ремонт и отделка (remont-kvartir-51.ru)' },
  {
    key: 'notifyOnKnowledgeTraining',
    label: 'Динамика изучения материалов на обучающей платформе',
  },
  {
    key: 'notifyOnWorkDays',
    label: 'Учёт рабочего времени (опоздания, ранний уход, автозакрытие)',
  },
  {
    key: 'notifyOnWaybills',
    label: 'Путевой лист (новые задания, правки, выполнение / невыполнение)',
  },
  {
    key: 'notifyOnInstallationSchedules',
    label: 'График монтажей (новые записи, правки, выполнение / невыполнение)',
  },
  {
    key: 'notifyOnRepairSchedules',
    label: 'График ремонтов (проекты, записи и изменение статусов)',
  },
  { key: 'notifyOnFurnitureSchedules', label: 'План-график мебели' },
  {
    key: 'notifyOnContractSigning',
    label: 'Электронное подписание договоров (подписан / отклонён / открыт клиентом)',
  },
  {
    key: 'notifyOnKnowledgeFeedback',
    label: 'Ошибки и предложения по обучающей платформе',
    superAdminOnly: true,
  },
  {
    key: 'notifyOnSiteFeedback',
    label: 'Ошибки и предложения по публичному сайту',
    superAdminOnly: true,
  },
];

const INTERVAL_OPTIONS = [30, 60, 120, 180, 300];

function intervalLabel(sec: number) {
  if (sec < 60) return `${sec} секунд`;
  if (sec === 60) return '1 минута';
  return `${sec / 60} минуты`;
}

export function MyNotificationsPageView() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  const [settings, setSettings] = useState<AdminNotificationsSettings | null>(null);
  /** Снимок последних загруженных/сохранённых настроек — для отслеживания несохранённых правок. */
  const [baseline, setBaseline] = useState<AdminNotificationsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [customSounds, setCustomSounds] = useState<{ id: string; name: string; fileUrl: string }[]>(
    []
  );
  const [uploading, setUploading] = useState(false);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAdminNotificationsSettings();
      setSettings(data);
      setBaseline(data);
    } catch (err) {
      console.error(err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomSounds = useCallback(async () => {
    try {
      const sounds = await getAdminNotificationSounds();
      setCustomSounds(sounds);
    } catch {
      setCustomSounds([]);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    loadCustomSounds();
  }, [loadSettings, loadCustomSounds]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      showToast('Браузер не поддерживает уведомления', 'error');
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);
      if (permission === 'granted') {
        showToast('Разрешение на уведомления получено', 'success');
        window.dispatchEvent(new Event('admin-push-sync'));
      } else if (permission === 'denied') {
        showToast('Уведомления заблокированы. Разрешите в настройках браузера.', 'error');
      } else {
        showToast('Разрешение не предоставлено', 'error');
      }
    } catch {
      showToast('Не удалось запросить разрешение', 'error');
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      const payload: Record<string, unknown> = {
        soundEnabled: settings.soundEnabled,
        soundVolume: settings.soundVolume,
        soundType: settings.soundType,
        customSoundUrl: settings.customSoundUrl,
        desktopNotifications: settings.desktopNotifications,
        checkIntervalSeconds: settings.checkIntervalSeconds,
      };
      for (const { key } of EVENT_TOGGLES) {
        payload[key] = settings[key] ?? true;
      }
      const updated = await updateMyAdminNotificationDeliveryPrefs(payload);
      setSettings(updated);
      setBaseline(updated);
      showToast('Настройки сохранены', 'success');
      if (updated.desktopNotifications) {
        window.dispatchEvent(new Event('admin-push-sync'));
      }
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    setToast(null);
    try {
      const updated = await resetMyAdminNotificationSettings();
      setSettings(updated);
      setBaseline(updated);
      showToast('Личные настройки сброшены. Применяются настройки роли.', 'success');
      window.dispatchEvent(new Event('admin-push-sync'));
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сброса', 'error');
    } finally {
      setResetting(false);
    }
  };

  const playTestSound = () => {
    if (!settings?.soundEnabled) return;
    try {
      playNotificationSound(
        settings.soundVolume ?? 70,
        (settings.soundType as NotificationSoundType) ?? 'beep',
        settings.customSoundUrl
      );
    } catch {
      showToast('Не удалось воспроизвести звук', 'error');
    }
  };

  const handleUploadSound = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setToast(null);
    try {
      const sound = await uploadAdminNotificationSound(file);
      setCustomSounds((prev) => [sound, ...prev]);
      setSettings((s) => (s ? { ...s, soundType: 'custom', customSoundUrl: sound.fileUrl } : s));
      showToast('Звук загружен. Сохраните настройки.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки', 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteSound = async (id: string) => {
    try {
      await deleteAdminNotificationSound(id);
      setCustomSounds((prev) => prev.filter((s) => s.id !== id));
      if (
        settings?.customSoundUrl &&
        customSounds.find((s) => s.id === id)?.fileUrl === settings.customSoundUrl
      ) {
        setSettings((s) => (s ? { ...s, soundType: 'beep', customSoundUrl: null } : s));
      }
      showToast('Звук удалён', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка удаления', 'error');
    }
  };

  const patchSettings = (patch: Partial<AdminNotificationsSettings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  };

  const hasPersonalOverride =
    settings != null &&
    typeof (settings as AdminNotificationsSettings & { deliveryOnly?: boolean }).deliveryOnly ===
      'boolean';

  const hasUnsavedChanges =
    settings != null && baseline != null && JSON.stringify(settings) !== JSON.stringify(baseline);

  const visibleEvents = EVENT_TOGGLES.filter(
    (t) => (!t.superAdminOnly || isSuperAdmin) && settings?.allowedEvents?.[t.key] !== false
  );

  return (
    <div className={cdBase.page}>
      <div className={`${cdHub.editorHeader} ${styles.header}`}>
        <div className={`${cdHub.contractsListHeaderLeft} ${styles.headerLeft}`}>
          <div className={cdHub.contractsHeaderTitleRow}>
            <div className={cdHub.contractsHeaderTitleCluster}>
              <div className={cdHub.contractsListHeaderTitleGroup}>
                <h1 className={`${cdHub.title} ${styles.title}`}>Мои уведомления</h1>
                <MyNotificationsRulesInfoTip />
              </div>
              <span
                className={`${styles.sourceBadge}${hasPersonalOverride ? ` ${styles.sourceBadgePersonal}` : ''}`}
                title={
                  hasPersonalOverride
                    ? 'Применяются ваши личные настройки'
                    : 'Применяются настройки роли'
                }
              >
                {hasPersonalOverride ? 'Личные настройки' : 'Настройки роли'}
              </span>
            </div>
          </div>
        </div>
        <div className={`${cdChrome.headerButtonsRow} ${styles.headerActions}`}>
          <button
            data-admin-mutation
            type="button"
            className={cdChrome.contractsListHeaderAddBtn}
            disabled={saving || !settings || !hasUnsavedChanges}
            title={hasUnsavedChanges ? undefined : 'Сначала внесите изменения в настройки'}
            onClick={() => void handleSave()}
          >
            {saving ? 'Сохранение…' : 'Сохранить'}
          </button>
          <button
            data-admin-mutation
            type="button"
            className={styles.resetBtn}
            disabled={resetting || !settings}
            onClick={() => void handleReset()}
          >
            {resetting ? 'Сброс…' : 'Сбросить к настройкам роли'}
          </button>
        </div>
      </div>

      {loading || !settings ? (
        <p className={loading ? styles.loading : styles.errorText}>
          {loading ? 'Загрузка настроек…' : 'Не удалось загрузить настройки'}
        </p>
      ) : (
        <>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}>События для уведомлений</h2>
            <div className={styles.rows}>
              {visibleEvents.length === 0 && (
                <p className={styles.hint}>
                  Для вашей роли супер-администратор не разрешил ни одного события уведомлений.
                </p>
              )}
              {visibleEvents.map((toggle) => (
                <label className={styles.row} key={toggle.key} htmlFor={toggle.key}>
                  <input
                    type="checkbox"
                    id={toggle.key}
                    className={styles.rowInput}
                    checked={settings[toggle.key] ?? true}
                    onChange={(e) => patchSettings({ [toggle.key]: e.target.checked })}
                  />
                  <span className={styles.rowLabel}>{toggle.label}</span>
                </label>
              ))}
            </div>
            <p className={styles.hint}>
              Показаны только события, разрешённые для вашей роли супер-администратором на странице
              «Уведомления в админке». Колокольчик в шапке, звук и браузерные push-уведомления
              приходят только по включённым событиям.
            </p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Звук</h2>
            <div className={styles.inlineRow}>
              <label className={styles.row} htmlFor="soundEnabled">
                <input
                  type="checkbox"
                  id="soundEnabled"
                  className={styles.rowInput}
                  checked={settings.soundEnabled}
                  onChange={(e) => patchSettings({ soundEnabled: e.target.checked })}
                />
                <span className={styles.rowLabel}>Звук при новом событии</span>
              </label>
              {settings.soundEnabled && (
                <>
                  <div className={styles.inlineField}>
                    <label className={styles.inlineFieldLabel} htmlFor="soundType">
                      Тип
                    </label>
                    <select
                      id="soundType"
                      className={styles.select}
                      value={settings.soundType}
                      onChange={(e) => {
                        const val = e.target.value as NotificationSoundType;
                        patchSettings({
                          soundType: val,
                          customSoundUrl: val !== 'custom' ? null : settings.customSoundUrl,
                        });
                      }}
                    >
                      {SOUND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  {settings.soundType === 'custom' && (
                    <div className={styles.inlineField}>
                      <label className={styles.inlineFieldLabel} htmlFor="customSoundUrl">
                        Файл
                      </label>
                      <select
                        id="customSoundUrl"
                        className={styles.select}
                        value={settings.customSoundUrl || ''}
                        onChange={(e) => patchSettings({ customSoundUrl: e.target.value || null })}
                      >
                        <option value="">— Выберите —</option>
                        {customSounds.map((s) => (
                          <option key={s.id} value={s.fileUrl}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className={`${styles.inlineField} ${styles.rangeField}`}>
                    <label className={styles.inlineFieldLabel} htmlFor="soundVolume">
                      Громкость: {settings.soundVolume}%
                    </label>
                    <input
                      type="range"
                      id="soundVolume"
                      className={styles.range}
                      min={0}
                      max={100}
                      value={settings.soundVolume}
                      onChange={(e) => patchSettings({ soundVolume: parseInt(e.target.value, 10) })}
                    />
                  </div>
                  <button type="button" className={styles.testButton} onClick={playTestSound}>
                    Проверить звук
                  </button>
                </>
              )}
            </div>
            {settings.soundEnabled && (
              <div className={`${styles.inlineRow} ${styles.inlineRowSpaced}`}>
                <div className={styles.inlineField}>
                  <label className={styles.inlineFieldLabel} htmlFor="soundFile">
                    Загрузить новый звук
                  </label>
                  <input
                    type="file"
                    id="soundFile"
                    className={styles.fileInput}
                    accept=".mp3,.wav,.ogg,.m4a,.aac"
                    onChange={handleUploadSound}
                    disabled={uploading}
                  />
                  {uploading && <span className={styles.uploading}>Загрузка…</span>}
                </div>
                {customSounds.length > 0 && (
                  <ul className={styles.soundsList}>
                    {customSounds.map((s) => (
                      <li key={s.id} className={styles.soundItem}>
                        <span>{s.name}</span>
                        <button
                          data-admin-mutation
                          type="button"
                          className={styles.deleteSoundBtn}
                          onClick={() => void handleDeleteSound(s.id)}
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {settings.soundEnabled && (
              <p className={styles.hint}>Форматы: mp3, wav, ogg, m4a, aac. Макс. 2 МБ.</p>
            )}
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}>Браузерные уведомления</h2>
            <div className={styles.inlineRow}>
              <label className={styles.row} htmlFor="desktopNotifications">
                <input
                  type="checkbox"
                  id="desktopNotifications"
                  className={styles.rowInput}
                  checked={settings.desktopNotifications}
                  onChange={(e) => patchSettings({ desktopNotifications: e.target.checked })}
                />
                <span className={styles.rowLabel}>На рабочем столе и в приложении (PWA)</span>
              </label>
              {permissionStatus === 'granted' ? (
                <span className={styles.permissionOk}>✓ Разрешение получено</span>
              ) : (
                <button
                  type="button"
                  className={styles.permissionButton}
                  onClick={() => void requestNotificationPermission()}
                >
                  {permissionStatus === 'denied' ? 'Разрешение заблокировано' : 'Разрешить'}
                </button>
              )}
              <div className={styles.inlineField}>
                <label className={styles.inlineFieldLabel} htmlFor="checkIntervalSeconds">
                  Интервал проверки
                </label>
                <select
                  id="checkIntervalSeconds"
                  className={styles.select}
                  value={settings.checkIntervalSeconds}
                  onChange={(e) =>
                    patchSettings({ checkIntervalSeconds: parseInt(e.target.value, 10) })
                  }
                >
                  {INTERVAL_OPTIONS.map((sec) => (
                    <option key={sec} value={sec}>
                      {intervalLabel(sec)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <p className={styles.hint}>
              Показывать уведомление вне вкладки браузера и на телефоне (если сайт установлен как
              приложение) при новом событии. Требуется разрешение браузера. Как часто проверять
              наличие новых событий (отзывы, заказы, чат).
            </p>
          </section>
        </>
      )}

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
