'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  deleteAdminCareerVacancy,
  getAdminCareersPage,
  listAdminCareerVacancies,
  updateAdminCareersPage,
} from '@/shared/api/careers';
import type { CareerVacancyInfo, CareersPageInfo } from '@/shared/lib/careers';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './CareersAdminPage.module.css';

export function CareersAdminPageView() {
  const [pageForm, setPageForm] = useState<CareersPageInfo | null>(null);
  const [vacancies, setVacancies] = useState<CareerVacancyInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, items] = await Promise.all([getAdminCareersPage(), listAdminCareerVacancies()]);
      setPageForm(page);
      setVacancies(items);
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
    } finally {
      setLoading(false);
    }
  }, [showSaveError]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSavePage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pageForm) return;
    setSavingPage(true);
    resetSaveFeedback();
    try {
      await updateAdminCareersPage(pageForm);
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSavingPage(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminCareerVacancy(deleteTarget.id);
      setDeleteTarget(null);
      await load();
      showSaveSuccess();
    } catch (err) {
      showSaveError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  if (loading || !pageForm) {
    return (
      <SettingsSubPageView title="Вакансии">
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title="Вакансии"
      subtitle="Страница /careers на сайте. Размещайте открытые вакансии для соискателей."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <Link
          data-admin-mutation
          href="/admin/content/careers/vacancies/new"
          className={styles.createButton}
        >
          + Добавить вакансию
        </Link>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        Публичная страница:{' '}
        <Link href="/careers" target="_blank" rel="noopener noreferrer">
          /careers
        </Link>
      </p>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки страницы</h2>
        <form onSubmit={handleSavePage} className={styles.form}>
          <label className={styles.field}>
            <span>Заголовок страницы</span>
            <input
              type="text"
              value={pageForm.pageTitle}
              onChange={(e) => setPageForm({ ...pageForm, pageTitle: e.target.value })}
              required
            />
          </label>
          <label className={styles.field}>
            <span>Вступительный текст</span>
            <textarea
              value={pageForm.introText ?? ''}
              onChange={(e) => setPageForm({ ...pageForm, introText: e.target.value })}
              rows={4}
            />
          </label>
          <label className={styles.checkboxField}>
            <input
              type="checkbox"
              checked={pageForm.isPublished}
              onChange={(e) => setPageForm({ ...pageForm, isPublished: e.target.checked })}
            />
            <span>Показывать страницу на сайте</span>
          </label>
          <button
            data-admin-mutation
            type="submit"
            className={styles.submitButton}
            disabled={savingPage}
          >
            {savingPage ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </form>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Список вакансий</h2>
        {vacancies.length === 0 ? (
          <p className={styles.empty}>Вакансий пока нет.</p>
        ) : (
          <div className={styles.list}>
            {vacancies.map((vacancy) => (
              <div key={vacancy.id} className={styles.card}>
                <div>
                  <h3 className={styles.cardTitle}>{vacancy.title}</h3>
                  {!vacancy.isPublished ? (
                    <span className={styles.badgeMuted}>Скрыта</span>
                  ) : (
                    <span className={styles.badge}>Опубликована</span>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Link
                    href={`/admin/content/careers/vacancies/${vacancy.id}`}
                    className={styles.editLink}
                  >
                    Редактировать
                  </Link>
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setDeleteTarget({ id: vacancy.id, title: vacancy.title })}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {deleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить вакансию?"
          message={`«${deleteTarget.title}» будет удалена без возможности восстановления.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </SettingsSubPageView>
  );
}
