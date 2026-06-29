'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  deleteAdminContactSalon,
  getAdminContactsPage,
  listAdminContactSalons,
  updateAdminContactsPage,
} from '@/shared/api/contacts';
import type { ContactSalonInfo, ContactsPageInfo } from '@/shared/lib/contacts';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { AdminFormMessage } from '@/shared/ui/admin/AdminFormMessage';
import { useAdminSaveFeedback } from '@/shared/ui/admin/useAdminSaveFeedback';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './ContactsAdminPage.module.css';

export function ContactsAdminPageView() {
  const [pageForm, setPageForm] = useState<ContactsPageInfo | null>(null);
  const [salons, setSalons] = useState<ContactSalonInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingPage, setSavingPage] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { saveNoticeVisible, errorMessage, showSaveSuccess, showSaveError, resetSaveFeedback } =
    useAdminSaveFeedback();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [page, items] = await Promise.all([getAdminContactsPage(), listAdminContactSalons()]);
      setPageForm(page);
      setSalons(items);
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
      await updateAdminContactsPage(pageForm);
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
      await deleteAdminContactSalon(deleteTarget.id);
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
      <SettingsSubPageView title="Контакты">
        <p className={styles.loading}>Загрузка...</p>
      </SettingsSubPageView>
    );
  }

  return (
    <SettingsSubPageView
      title="Контакты"
      subtitle="Страница /contacts на сайте. Салоны, адреса, телефоны и менеджеры."
      saveNoticeVisible={saveNoticeVisible}
      headerActions={
        <Link
          data-admin-mutation
          href="/admin/content/contacts/salons/new"
          className={styles.createButton}
        >
          + Добавить салон
        </Link>
      }
    >
      {errorMessage ? <AdminFormMessage type="error">{errorMessage}</AdminFormMessage> : null}

      <p className={styles.previewHint}>
        Публичная страница:{' '}
        <Link href="/contacts" target="_blank" rel="noopener noreferrer">
          /contacts
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
        <h2 className={styles.sectionTitle}>Салоны</h2>
        {salons.length === 0 ? (
          <p className={styles.empty}>Салонов пока нет.</p>
        ) : (
          <div className={styles.list}>
            {salons.map((salon) => (
              <div key={salon.id} className={styles.card}>
                <div>
                  <h3 className={styles.cardTitle}>{salon.name}</h3>
                  <p className={styles.cardMeta}>{salon.address}</p>
                  {salon.phone ? <p className={styles.cardMeta}>{salon.phone}</p> : null}
                  {salon.managers.length > 0 ? (
                    <p className={styles.cardMeta}>Менеджеров: {salon.managers.length}</p>
                  ) : null}
                  {!salon.isPublished ? (
                    <span className={styles.badgeMuted}>Скрыт</span>
                  ) : (
                    <span className={styles.badge}>Опубликован</span>
                  )}
                </div>
                <div className={styles.cardActions}>
                  <Link
                    href={`/admin/content/contacts/salons/${salon.id}`}
                    className={styles.editLink}
                  >
                    Редактировать
                  </Link>
                  <button
                    data-admin-mutation
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setDeleteTarget({ id: salon.id, name: salon.name })}
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
          title="Удалить салон?"
          message={`«${deleteTarget.name}» будет удалён вместе с менеджерами.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </SettingsSubPageView>
  );
}
