'use client';

import React, { useCallback, useEffect, useState } from 'react';

import type {
  AdminNotificationsSettings,
  NotificationSound,
} from '@/shared/api/admin-notifications';
import {
  deleteAdminNotificationSound,
  getAdminNotificationSounds,
  getAdminNotificationsSettingsByRole,
  updateAdminNotificationsSettings,
  uploadAdminNotificationSound,
} from '@/shared/api/admin-notifications';
import { type NotificationSoundType, playNotificationSound } from '@/shared/lib/notification-sound';

import styles from './NotificationsSection.module.css';
import { ROLES_CONFIG } from './rolesConfig';

const ADMIN_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'CONTENT_MANAGER',
  'MODERATOR',
  'SUPPORT',
  'PARTNER',
] as const;

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: 'default', label: 'По умолчанию (для всех ролей)' },
  ...ADMIN_ROLES.map((r) => ({
    value: r,
    label: ROLES_CONFIG.find((c) => c.id === r)?.label ?? r,
  })),
];

const SOUND_OPTIONS: { value: NotificationSoundType; label: string }[] = [
  { value: 'beep', label: 'Beep (короткий)' },
  { value: 'ding', label: 'Ding (звонок)' },
  { value: 'chime', label: 'Chime (перелив)' },
  { value: 'bell', label: 'Bell (колокольчик)' },
  { value: 'custom', label: 'Свой звук (загруженный)' },
];

export function NotificationsSection() {
  const [settings, setSettings] = useState<AdminNotificationsSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | null>(null);
  const [customSounds, setCustomSounds] = useState<NotificationSound[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<string>('default');

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    try {
      const role = selectedRole === 'default' ? null : selectedRole;
      const data = await getAdminNotificationsSettingsByRole(role);
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, [selectedRole]);

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
  }, [loadSettings]);

  useEffect(() => {
    loadCustomSounds();
  }, [loadCustomSounds]);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      const payload = {
        ...settings,
        role: selectedRole === 'default' ? null : selectedRole,
      };
      await updateAdminNotificationsSettings(payload);
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
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
      setSettings((s) =>
        s
          ? {
              ...s,
              soundType: 'custom',
              customSoundUrl: sound.fileUrl,
            }
          : s
      );
      showToast('Звук загружен. Выберите его в списке и сохраните настройки.', 'success');
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
      } else if (permission === 'denied') {
        showToast('Уведомления заблокированы. Разрешите в настройках браузера.', 'error');
      } else {
        showToast('Разрешение не предоставлено', 'error');
      }
    } catch (err) {
      showToast('Не удалось запросить разрешение', 'error');
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
        <h2 className={styles.sectionTitle}>Уведомления в админке</h2>
        <p className={styles.sectionDescription}>
          Настройте звуковые и браузерные уведомления при появлении новых отзывов, заказов и
          сообщений в чате поддержки. Можно задать разные настройки для каждой роли.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          <div className={styles.formRow}>
            <label htmlFor="roleSelector" className={styles.label}>
              Настройки для роли
            </label>
            <select
              id="roleSelector"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className={styles.select}
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className={styles.hint}>
              Выберите роль, для которой редактируете настройки. «По умолчанию» применяется ко всем
              ролям без собственного профиля.
            </p>
          </div>
          <h3 className={styles.subsectionTitle}>События для уведомлений</h3>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="notifyOnReviews"
              checked={settings.notifyOnReviews}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, notifyOnReviews: e.target.checked } : s))
              }
            />
            <label htmlFor="notifyOnReviews">Новые отзывы на товары</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="notifyOnOrders"
              checked={settings.notifyOnOrders}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, notifyOnOrders: e.target.checked } : s))
              }
            />
            <label htmlFor="notifyOnOrders">Новые заказы</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="notifyOnSupportChat"
              checked={settings.notifyOnSupportChat}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, notifyOnSupportChat: e.target.checked } : s))
              }
            />
            <label htmlFor="notifyOnSupportChat">Сообщения в чате поддержки</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="notifyOnMeasurementForm"
              checked={settings.notifyOnMeasurementForm}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, notifyOnMeasurementForm: e.target.checked } : s))
              }
            />
            <label htmlFor="notifyOnMeasurementForm">Запись на замер</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="notifyOnCallbackForm"
              checked={settings.notifyOnCallbackForm}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, notifyOnCallbackForm: e.target.checked } : s))
              }
            />
            <label htmlFor="notifyOnCallbackForm">Заказ обратного звонка</label>
          </div>

          <h3 className={styles.subsectionTitle}>Звук</h3>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="soundEnabled"
              checked={settings.soundEnabled}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, soundEnabled: e.target.checked } : s))
              }
            />
            <label htmlFor="soundEnabled">Звук при новом событии</label>
          </div>

          {settings.soundEnabled && (
            <>
              <div className={styles.formRow}>
                <label htmlFor="soundType" className={styles.label}>
                  Тип звука
                </label>
                <select
                  id="soundType"
                  value={settings.soundType}
                  onChange={(e) => {
                    const val = e.target.value as NotificationSoundType;
                    setSettings((s) =>
                      s
                        ? {
                            ...s,
                            soundType: val,
                            customSoundUrl: val !== 'custom' ? null : s.customSoundUrl,
                          }
                        : s
                    );
                  }}
                  className={styles.select}
                >
                  {SOUND_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              {settings.soundType === 'custom' && (
                <div className={styles.formRow}>
                  <label className={styles.label}>Выберите загруженный звук</label>
                  <select
                    value={settings.customSoundUrl || ''}
                    onChange={(e) =>
                      setSettings((s) => (s ? { ...s, customSoundUrl: e.target.value || null } : s))
                    }
                    className={styles.select}
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
              <div className={styles.uploadSection}>
                <label className={styles.label}>Загрузить новый звук</label>
                <p className={styles.hint}>Форматы: mp3, wav, ogg, m4a, aac. Макс. 2 МБ.</p>
                <input
                  type="file"
                  accept=".mp3,.wav,.ogg,.m4a,.aac"
                  onChange={handleUploadSound}
                  disabled={uploading}
                  className={styles.fileInput}
                />
                {uploading && <span className={styles.uploading}>Загрузка...</span>}
              </div>
              {customSounds.length > 0 && (
                <div className={styles.customSoundsList}>
                  <label className={styles.label}>Загруженные звуки</label>
                  <ul className={styles.soundsList}>
                    {customSounds.map((s) => (
                      <li key={s.id} className={styles.soundItem}>
                        <span>{s.name}</span>
                        <button
                          type="button"
                          className={styles.deleteSoundBtn}
                          onClick={() => handleDeleteSound(s.id)}
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className={styles.formRow}>
                <label htmlFor="soundVolume" className={styles.label}>
                  Громкость: {settings.soundVolume}%
                </label>
                <input
                  type="range"
                  id="soundVolume"
                  min={0}
                  max={100}
                  value={settings.soundVolume}
                  onChange={(e) =>
                    setSettings((s) =>
                      s ? { ...s, soundVolume: parseInt(e.target.value, 10) } : s
                    )
                  }
                  className={styles.range}
                />
              </div>
              <button type="button" className={styles.testButton} onClick={playTestSound}>
                Проверить звук
              </button>
            </>
          )}

          <h3 className={styles.subsectionTitle}>Браузерные уведомления</h3>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="desktopNotifications"
              checked={settings.desktopNotifications}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, desktopNotifications: e.target.checked } : s))
              }
            />
            <label htmlFor="desktopNotifications">Уведомления на рабочем столе (вне вкладки)</label>
          </div>
          <p className={styles.hint}>
            Показывать уведомление вне вкладки браузера при новом событии (требуется разрешение
            браузера).
          </p>
          <div className={styles.permissionRow}>
            {permissionStatus === 'granted' ? (
              <span className={styles.permissionOk}>✓ Разрешение на уведомления получено</span>
            ) : (
              <button
                type="button"
                className={styles.permissionButton}
                onClick={requestNotificationPermission}
              >
                {permissionStatus === 'denied'
                  ? 'Разрешение заблокировано — откройте настройки браузера'
                  : 'Разрешить уведомления'}
              </button>
            )}
          </div>

          <div className={styles.formRow}>
            <label htmlFor="checkIntervalSeconds" className={styles.label}>
              Интервал проверки: {settings.checkIntervalSeconds} сек
            </label>
            <select
              id="checkIntervalSeconds"
              value={settings.checkIntervalSeconds}
              onChange={(e) =>
                setSettings((s) =>
                  s ? { ...s, checkIntervalSeconds: parseInt(e.target.value, 10) } : s
                )
              }
              className={styles.select}
            >
              <option value={30}>30 секунд</option>
              <option value={60}>1 минута</option>
              <option value={120}>2 минуты</option>
              <option value={180}>3 минуты</option>
              <option value={300}>5 минут</option>
            </select>
          </div>
          <p className={styles.hint}>
            Как часто проверять наличие новых событий (отзывы, заказы, чат).
          </p>

          <button type="submit" className={styles.saveButton} disabled={saving}>
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
