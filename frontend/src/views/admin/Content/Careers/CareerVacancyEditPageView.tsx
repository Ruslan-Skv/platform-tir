'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  createAdminCareerVacancy,
  getAdminCareerVacancy,
  updateAdminCareerVacancy,
} from '@/shared/api/careers';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './CareersAdminPage.module.css';

type FormState = {
  title: string;
  description: string;
  requirements: string;
  conditions: string;
  contactEmail: string;
  sortOrder: number;
  isPublished: boolean;
};

const EMPTY_FORM: FormState = {
  title: '',
  description: '',
  requirements: '',
  conditions: '',
  contactEmail: '',
  sortOrder: 0,
  isPublished: true,
};

type CareerVacancyEditPageViewProps = {
  vacancyId?: string;
};

export function CareerVacancyEditPageView({ vacancyId }: CareerVacancyEditPageViewProps) {
  const router = useRouter();
  const isNew = !vacancyId;
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    if (!vacancyId) return;
    const data = await getAdminCareerVacancy(vacancyId);
    setForm({
      title: data.title,
      description: data.description,
      requirements: data.requirements ?? '',
      conditions: data.conditions ?? '',
      contactEmail: data.contactEmail ?? '',
      sortOrder: data.sortOrder,
      isPublished: data.isPublished,
    });
  }, [vacancyId]);

  useEffect(() => {
    if (isNew) return;
    setLoading(true);
    load()
      .catch(() => showSaveError('Не удалось загрузить вакансию'))
      .finally(() => setLoading(false));
  }, [isNew, load, showSaveError]);

  const updateField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    resetSaveFeedback();
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        requirements: form.requirements.trim() || null,
        conditions: form.conditions.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        sortOrder: form.sortOrder,
        isPublished: form.isPublished,
      };

      if (isNew) {
        const created = await createAdminCareerVacancy(payload);
        showSaveSuccess();
        router.replace(`/admin/content/careers/vacancies/${created.id}`);
        return;
      }

      await updateAdminCareerVacancy(vacancyId!, payload);
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
      <SettingsSubPageView title={isNew ? 'Новая вакансия' : 'Редактирование вакансии'}>
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title={isNew ? 'Новая вакансия' : 'Редактирование вакансии'}
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <button
          data-admin-mutation
          type="submit"
          form="career-vacancy-form"
          disabled={saving}
          className={styles.submitButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        <Link href="/admin/content/careers">← К списку вакансий</Link>
      </p>

      <form id="career-vacancy-form" onSubmit={handleSubmit} className={styles.form}>
        <label className={styles.field}>
          <span>Название вакансии *</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => updateField('title', e.target.value)}
            placeholder="Менеджер по продажам"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Описание *</span>
          <textarea
            value={form.description}
            onChange={(e) => updateField('description', e.target.value)}
            rows={8}
            placeholder="Обязанности и суть работы…"
            required
          />
        </label>

        <label className={styles.field}>
          <span>Требования</span>
          <textarea
            value={form.requirements}
            onChange={(e) => updateField('requirements', e.target.value)}
            rows={6}
            placeholder="Опыт, навыки, личные качества…"
          />
        </label>

        <label className={styles.field}>
          <span>Условия</span>
          <textarea
            value={form.conditions}
            onChange={(e) => updateField('conditions', e.target.value)}
            rows={4}
            placeholder="График, зарплата, оформление…"
          />
        </label>

        <label className={styles.field}>
          <span>Email для откликов</span>
          <input
            type="email"
            value={form.contactEmail}
            onChange={(e) => updateField('contactEmail', e.target.value)}
            placeholder="skvirya@mail.ru"
          />
        </label>

        <label className={styles.field}>
          <span>Порядок сортировки</span>
          <input
            type="number"
            min={0}
            value={form.sortOrder}
            onChange={(e) => updateField('sortOrder', Number(e.target.value) || 0)}
          />
        </label>

        <label className={styles.checkboxField}>
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => updateField('isPublished', e.target.checked)}
          />
          <span>Показывать на сайте</span>
        </label>
      </form>
    </SettingsSubPageView>
  );
}
