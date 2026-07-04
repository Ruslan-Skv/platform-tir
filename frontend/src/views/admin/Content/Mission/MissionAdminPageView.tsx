'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { getAdminMissionPage, updateAdminMissionPage } from '@/shared/api/mission';
import type { MissionPageInfo } from '@/shared/lib/mission';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from '../Careers/CareersAdminPage.module.css';

export function MissionAdminPageView() {
  const [form, setForm] = useState<MissionPageInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setForm(await getAdminMissionPage());
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [showSaveError]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;

    setSaving(true);
    resetSaveFeedback();
    try {
      await updateAdminMissionPage(form);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !form) {
    return (
      <SettingsSubPageView title="Миссия компании">
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title="Миссия компании"
      subtitle="Страница /mission на сайте. Заголовок — на самой странице, название ссылки — в футере."
      saveNoticeVisible={saveNoticeVisible}
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        Публичная страница:{' '}
        <Link href="/mission" target="_blank" rel="noopener noreferrer">
          /mission
        </Link>
        . Название ссылки в футере можно также править в{' '}
        <Link href="/admin/content/footer">настройках футера</Link>.
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Текст страницы</h2>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            <span>Заголовок страницы</span>
            <input
              type="text"
              value={form.pageTitle}
              onChange={(e) => setForm({ ...form, pageTitle: e.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Название ссылки в футере</span>
            <input
              type="text"
              value={form.footerLinkName ?? ''}
              onChange={(e) => setForm({ ...form, footerLinkName: e.target.value })}
              placeholder="Например: Наша миссия"
            />
          </label>
          <label className={styles.field}>
            <span>Краткая формулировка</span>
            <textarea
              value={form.introText ?? ''}
              onChange={(e) => setForm({ ...form, introText: e.target.value })}
              rows={3}
              placeholder="Одна строка под заголовком на сайте"
            />
          </label>
          <label className={styles.field}>
            <span>Миссия компании</span>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              rows={12}
              required
            />
          </label>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
            />
            <span>Показывать страницу на сайте</span>
          </label>
          <button
            data-admin-mutation
            type="submit"
            className={styles.submitButton}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </form>
      </section>
    </SettingsSubPageView>
  );
}
