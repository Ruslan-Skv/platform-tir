'use client';

import { useEffect, useState } from 'react';

import {
  getAdminNotificationsSettings,
  updateMyAdminNotificationDeliveryPrefs,
} from '@/shared/api/admin-notifications';
import type { AdminNotificationsSettings } from '@/shared/api/admin-notifications';
import { Modal } from '@/shared/ui/Modal';

import styles from './AdminMyNotificationsModal.module.css';

type AdminMyNotificationsModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: (settings: AdminNotificationsSettings) => void;
};

function getNotificationPermission(): NotificationPermission | 'unsupported' {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export function AdminMyNotificationsModal({
  open,
  onClose,
  onSaved,
}: AdminMyNotificationsModalProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(70);
  const [desktopNotifications, setDesktopNotifications] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(
    'unsupported'
  );

  useEffect(() => {
    if (!open) return;
    setError(null);
    setPermission(getNotificationPermission());
    setLoading(true);
    void getAdminNotificationsSettings()
      .then((s) => {
        setSoundEnabled(s.soundEnabled);
        setSoundVolume(s.soundVolume);
        setDesktopNotifications(s.desktopNotifications);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Не удалось загрузить настройки');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const handleClose = () => {
    if (saving) return;
    onClose();
  };

  const persist = async (patch: {
    soundEnabled?: boolean;
    soundVolume?: number;
    desktopNotifications?: boolean;
  }) => {
    setSaving(true);
    setError(null);
    try {
      const next = await updateMyAdminNotificationDeliveryPrefs({
        soundEnabled: patch.soundEnabled ?? soundEnabled,
        soundVolume: patch.soundVolume ?? soundVolume,
        desktopNotifications: patch.desktopNotifications ?? desktopNotifications,
      });
      setSoundEnabled(next.soundEnabled);
      setSoundVolume(next.soundVolume);
      setDesktopNotifications(next.desktopNotifications);
      onSaved?.(next);
      if (next.desktopNotifications) {
        window.dispatchEvent(new Event('admin-push-sync'));
      }
      return next;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось сохранить');
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDesktopToggle = async (checked: boolean) => {
    setDesktopNotifications(checked);
    try {
      if (checked && typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission();
          setPermission(result);
          if (result !== 'granted') {
            setDesktopNotifications(false);
            setError(
              result === 'denied'
                ? 'Разрешение отклонено. Включите уведомления в настройках браузера для этого сайта.'
                : 'Без разрешения браузера уведомления на рабочем столе недоступны.'
            );
            await persist({ desktopNotifications: false });
            return;
          }
        } else if (Notification.permission === 'denied') {
          setDesktopNotifications(false);
          setPermission('denied');
          setError(
            'Уведомления заблокированы в браузере. Откройте настройки сайта и разрешите уведомления.'
          );
          return;
        }
        setPermission(Notification.permission);
      }
      await persist({ desktopNotifications: checked });
    } catch {
      setDesktopNotifications(!checked);
    }
  };

  const handleSoundToggle = async (checked: boolean) => {
    setSoundEnabled(checked);
    try {
      await persist({ soundEnabled: checked });
    } catch {
      setSoundEnabled(!checked);
    }
  };

  const handleVolumeChange = (value: number) => {
    setSoundVolume(value);
  };

  const handleVolumeCommit = async () => {
    try {
      await persist({ soundVolume });
    } catch {
      /* error already set */
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      title="Мои уведомления"
      size="md"
      className={styles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div className={styles.formShell} data-modal-form data-modal-density="compact">
        <p data-modal-form-hint className={styles.hint}>
          Какие события приходят — настраивает администратор для вашей роли. Здесь только способ
          доставки: рабочий стол / PWA и звук в колокольчике.
        </p>

        {loading ? (
          <p data-modal-form-hint>Загрузка…</p>
        ) : (
          <div data-modal-form-grid>
            <div data-modal-form-group data-modal-span>
              <label htmlFor="my-notif-desktop" className={styles.toggleLabel}>
                <input
                  id="my-notif-desktop"
                  type="checkbox"
                  checked={desktopNotifications}
                  disabled={saving || permission === 'unsupported'}
                  onChange={(e) => void handleDesktopToggle(e.target.checked)}
                />
                Уведомления на рабочем столе и в PWA
              </label>
              {permission === 'denied' ? (
                <p data-modal-form-hint className={styles.hintFlush}>
                  Браузер заблокировал уведомления. Откройте настройки сайта (замок в адресной
                  строке) и разрешите уведомления, затем включите снова.
                </p>
              ) : permission === 'unsupported' ? (
                <p data-modal-form-hint className={styles.hintFlush}>
                  Этот браузер не поддерживает уведомления.
                </p>
              ) : permission === 'granted' && desktopNotifications ? (
                <p data-modal-form-hint className={styles.hintFlush}>
                  Разрешение получено — push будет работать при закрытой вкладке (если сайт в PWA
                  или браузер позволяет).
                </p>
              ) : null}
            </div>

            <div data-modal-form-group data-modal-span>
              <label htmlFor="my-notif-sound" className={styles.toggleLabel}>
                <input
                  id="my-notif-sound"
                  type="checkbox"
                  checked={soundEnabled}
                  disabled={saving}
                  onChange={(e) => void handleSoundToggle(e.target.checked)}
                />
                Звук в колокольчике
              </label>
            </div>

            {soundEnabled ? (
              <div data-modal-form-group data-modal-span>
                <label htmlFor="my-notif-volume">Громкость: {soundVolume}%</label>
                <input
                  id="my-notif-volume"
                  type="range"
                  min={0}
                  max={100}
                  value={soundVolume}
                  disabled={saving}
                  onChange={(e) => handleVolumeChange(parseInt(e.target.value, 10))}
                  onMouseUp={() => void handleVolumeCommit()}
                  onTouchEnd={() => void handleVolumeCommit()}
                  onBlur={() => void handleVolumeCommit()}
                />
              </div>
            ) : null}
          </div>
        )}

        {error ? (
          <p data-modal-form-error role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={handleClose} disabled={saving}>
            Закрыть
          </button>
        </div>
      </div>
    </Modal>
  );
}
