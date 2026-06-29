'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { getAdminSiteDisclaimer, updateAdminSiteDisclaimer } from '@/shared/api/site-disclaimer';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from '../seller-legal/SellerLegalSettingsPage.module.css';

type FormState = {
  content: string;
  isPublished: boolean;
};

export function SiteDisclaimerSettingsPageView() {
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    try {
      const data = await getAdminSiteDisclaimer();
      setForm({
        content: data.content,
        isPublished: data.isPublished,
      });
    } catch (err) {
      console.error(err);
      setForm(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    resetSaveFeedback();
    try {
      await updateAdminSiteDisclaimer({
        content: form.content.trim(),
        isPublished: form.isPublished,
      });
      showSaveSuccess();
      await load();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SettingsSubPageView title="Информация на сайте">
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  if (!form) {
    return (
      <SettingsSubPageView title="Информация на сайте">
        <AdminFormMessage type="error">Не удалось загрузить настройки</AdminFormMessage>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title="Информация на сайте (не оферта)"
      subtitle="Правовая оговорка для посетителей: информация на сайте не является публичной офертой. Текст отображается в подвале на всех страницах."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form="site-disclaimer-form"
          disabled={saving}
          className={styles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <form id="site-disclaimer-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Текст оговорки</span>
          <textarea
            value={form.content}
            onChange={(e) => updateField('content', e.target.value)}
            rows={8}
            required
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField('isPublished', e.target.checked)}
          />
          <span>Показывать в подвале сайта</span>
        </label>
      </form>
    </SettingsSubPageView>
  );
}
