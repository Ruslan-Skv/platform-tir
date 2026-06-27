'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import type { UserCabinetSettings } from '@/shared/api/admin-user-cabinet';
import {
  getAdminUserCabinetSettings,
  updateAdminUserCabinetSettings,
  uploadRegistrationPrivacyPolicy,
} from '@/shared/api/admin-user-cabinet';
import { QuizAdminFileUpload } from '@/views/admin/Quiz/ui/QuizAdminFileUpload';

import styles from './UserCabinetSection.module.css';

export function UserCabinetSection() {
  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<UserCabinetSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPrivacyPolicy, setUploadingPrivacyPolicy] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadSettings = useCallback(async () => {
    try {
      const data = await getAdminUserCabinetSettings();
      setSettings(data);
    } catch (err) {
      console.error(err);
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const setConsentField = <K extends keyof UserCabinetSettings>(
    key: K,
    value: UserCabinetSettings[K]
  ) => {
    setSettings((s) => (s ? { ...s, [key]: value } : s));
  };

  const handleUploadPrivacyPolicy = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !settings) return;
    setUploadingPrivacyPolicy(true);
    try {
      const { url } = await uploadRegistrationPrivacyPolicy(file);
      setConsentField('privacyPolicyUrl', url);
      showToast('PDF политики загружен', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка загрузки PDF', 'error');
    } finally {
      setUploadingPrivacyPolicy(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setSaving(true);
    setToast(null);
    try {
      await updateAdminUserCabinetSettings(settings);
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.accessDenied}>
          Настройки личного кабинета доступны только супер-администратору.
        </p>
      </div>
    );
  }

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
        <h2 className={styles.sectionTitle}>Настройки личного кабинета пользователя</h2>
        <p className={styles.sectionDescription}>
          Управление разделами, отображаемыми в личном кабинете пользователя на сайте. Отключённые
          разделы не будут видны пользователям.
        </p>
        <form onSubmit={handleSave} className={styles.form}>
          {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>}
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showProfileSection"
              checked={settings.showProfileSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showProfileSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showProfileSection">Показывать раздел «Личные данные»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showOrdersSection"
              checked={settings.showOrdersSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showOrdersSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showOrdersSection">Показывать раздел «Мои заказы»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showNotificationsSection"
              checked={settings.showNotificationsSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showNotificationsSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showNotificationsSection">Показывать раздел «Уведомления»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showNotificationHistory"
              checked={settings.showNotificationHistory !== false}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showNotificationHistory: e.target.checked } : s))
              }
            />
            <label htmlFor="showNotificationHistory">
              Показывать историю уведомлений (только чтение, без редактирования и удаления)
            </label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showPasswordSection"
              checked={settings.showPasswordSection}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showPasswordSection: e.target.checked } : s))
              }
            />
            <label htmlFor="showPasswordSection">Показывать раздел «Смена пароля»</label>
          </div>
          <div className={styles.checkboxRow}>
            <input
              type="checkbox"
              id="showQuickLinks"
              checked={settings.showQuickLinks}
              onChange={(e) =>
                setSettings((s) => (s ? { ...s, showQuickLinks: e.target.checked } : s))
              }
            />
            <label htmlFor="showQuickLinks">
              Показывать быстрые ссылки (Избранное, Корзина и др.)
            </label>
          </div>

          <div className={styles.consentSection}>
            <h3 className={styles.consentTitle}>Согласие на обработку данных (формы сайта)</h3>
            <p className={styles.consentHint}>
              Единая политика для регистрации, «Заказать звонок», «Записаться на замер», «Рассчитать
              стоимость», «Письмо директору» и кнопки обратной связи на сайте. Квизы на отдельных
              доменах настраиваются в админке квиза. По клику на «персональных данных» —{' '}
              <code>/auth/privacy-policy</code>.
            </p>
            <label className={styles.consentField}>
              PDF политики (рекомендуется)
              <QuizAdminFileUpload
                url={settings.privacyPolicyUrl}
                onUrlChange={(v) => setConsentField('privacyPolicyUrl', v)}
                onFileSelect={handleUploadPrivacyPolicy}
                uploading={uploadingPrivacyPolicy}
                accept=".pdf,application/pdf"
                uploadLabel="Загрузить PDF"
                placeholder="https://…/policy.pdf"
              />
            </label>
            <div className={styles.consentGrid}>
              <label className={styles.consentField}>
                Текст рядом с галочкой
                <input
                  value={settings.consentText ?? ''}
                  onChange={(e) => setConsentField('consentText', e.target.value)}
                  placeholder="Я согласен(-на) на обработку персональных данных"
                />
              </label>
              <label className={styles.consentField}>
                Кликабельная фраза (в тексте выше)
                <input
                  value={settings.consentLinkText ?? ''}
                  onChange={(e) => setConsentField('consentLinkText', e.target.value)}
                  placeholder="персональных данных"
                />
              </label>
              <label className={`${styles.consentField} ${styles.consentFieldFull}`}>
                Заголовок окна политики
                <input
                  value={settings.privacyPolicyTitle ?? ''}
                  onChange={(e) => setConsentField('privacyPolicyTitle', e.target.value)}
                  placeholder="Политика конфиденциальности персональных данных"
                />
              </label>
            </div>
            <label className={`${styles.consentField} ${styles.consentFieldFull}`}>
              <span className={styles.consentFieldLabel}>
                Текст политики (если нет PDF)
                <span className={styles.consentFieldHint}>
                  Переносы строк — только для редактирования
                </span>
              </span>
              <textarea
                value={settings.privacyPolicyContent ?? ''}
                onChange={(e) => setConsentField('privacyPolicyContent', e.target.value)}
                rows={8}
                placeholder="Вставьте текст политики конфиденциальности…"
              />
            </label>
          </div>

          <div className={styles.actions}>
            <button
              data-admin-mutation
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? 'Сохранение...' : 'Сохранить'}
            </button>
            <Link href="/login" target="_blank" rel="noreferrer" className={styles.previewLink}>
              Форма регистрации →
            </Link>
            <Link href="/profile" target="_blank" rel="noreferrer" className={styles.previewLink}>
              Личный кабинет →
            </Link>
          </div>
        </form>
      </section>
    </div>
  );
}
