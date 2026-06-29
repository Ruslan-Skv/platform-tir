'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { deleteAdminPublicOffer, listAdminPublicOffers } from '@/shared/api/public-offer';
import { SITE_PUBLIC_OFFERS_PATH, publicOfferPath } from '@/shared/lib/legal/public-offer';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';
import { SettingsSubPageView } from '@/views/admin/Settings/shared/SettingsSubPageView';

import styles from './PublicOffersListPage.module.css';

type DeleteTarget = { id: string; name: string };

export function PublicOffersListPageView() {
  const [offers, setOffers] = useState<Awaited<ReturnType<typeof listAdminPublicOffers>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setOffers(await listAdminPublicOffers());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось загрузить оферты');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteAdminPublicOffer(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SettingsSubPageView
      title="Публичные оферты"
      subtitle="Договоры оферты для разных товаров и услуг. Назначайте области применения по категориям каталога."
      headerActions={
        <Link
          data-admin-mutation
          href="/admin/settings/public-offers/new"
          className={styles.createButton}
        >
          + Добавить оферту
        </Link>
      }
    >
      {error ? <p className={styles.error}>{error}</p> : null}

      <p className={styles.previewHint}>
        Публичный список:{' '}
        <Link href={SITE_PUBLIC_OFFERS_PATH} target="_blank" rel="noopener noreferrer">
          {SITE_PUBLIC_OFFERS_PATH}
        </Link>
      </p>

      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : offers.length === 0 ? (
        <p className={styles.empty}>Оферт пока нет. Добавьте первую.</p>
      ) : (
        <div className={styles.list}>
          {offers.map((offer) => (
            <div key={offer.id} className={styles.card}>
              <div className={styles.cardMain}>
                <h3 className={styles.cardTitle}>{offer.pageTitle}</h3>
                <p className={styles.cardMeta}>
                  <span>/{offer.slug}</span>
                  {offer.isDefault ? <span className={styles.badge}>По умолчанию</span> : null}
                  {!offer.isPublished ? <span className={styles.badgeMuted}>Черновик</span> : null}
                  {!offer.isConfigured ? (
                    <span className={styles.badgeMuted}>Нет текста/PDF</span>
                  ) : null}
                </p>
                {offer.name !== offer.pageTitle ? (
                  <p className={styles.cardName}>{offer.name}</p>
                ) : null}
              </div>
              <div className={styles.cardActions}>
                {offer.isPublished && offer.isConfigured ? (
                  <Link
                    href={publicOfferPath(offer.slug)}
                    target="_blank"
                    className={styles.viewLink}
                  >
                    На сайте
                  </Link>
                ) : null}
                <Link
                  href={`/admin/settings/public-offers/${offer.id}`}
                  className={styles.editLink}
                >
                  Редактировать
                </Link>
                <button
                  data-admin-mutation
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => setDeleteTarget({ id: offer.id, name: offer.pageTitle })}
                >
                  Удалить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget ? (
        <ConfirmModal
          isOpen
          title="Удалить оферту?"
          message={`«${deleteTarget.name}» будет удалена без возможности восстановления.`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      ) : null}
    </SettingsSubPageView>
  );
}
