'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { AdminPromotion } from '@/shared/api/admin-promotions';
import { deletePromotion, getAdminPromotions } from '@/shared/api/admin-promotions';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './PromotionsPage.module.css';

export function PromotionsPage() {
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminPromotions({ limit: 100 });
      setPromotions(res.data);
    } catch {
      showMessage('error', 'Ошибка загрузки акций');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deletePromotion(deleteTarget.id);
      showMessage('success', 'Акция удалена');
      setDeleteTarget(null);
      loadPromotions();
    } catch (e) {
      showMessage('error', e instanceof Error ? e.message : 'Ошибка удаления');
    } finally {
      setDeleting(false);
    }
  };

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    if (url.startsWith('/uploads/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      return `${apiUrl.replace(/\/$/, '')}${url}`;
    }
    return url;
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Акции</h1>
        <div className={styles.headerActions}>
          <Link href="/admin/content/promotions/new" className={styles.createButton}>
            + Добавить акцию
          </Link>
          <Link href="/promotions" target="_blank" rel="noreferrer" className={styles.viewLink}>
            Просмотр на сайте
          </Link>
        </div>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : promotions.length === 0 ? (
        <p className={styles.empty}>Акций пока нет. Добавьте первую акцию.</p>
      ) : (
        <div className={styles.list}>
          {promotions.map((promo) => (
            <div key={promo.id} className={styles.card}>
              <div className={styles.cardImage}>
                <img src={getImageUrl(promo.imageUrl)} alt={promo.title} />
              </div>
              <div className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{promo.title}</h3>
                {promo.description && <p className={styles.cardDescription}>{promo.description}</p>}
                <span className={styles.cardSlug}>/{promo.slug}</span>
                {!promo.isActive && <span className={styles.inactive}>Неактивна</span>}
                <div className={styles.cardActions}>
                  <Link
                    href={`/admin/content/promotions/${promo.id}/edit`}
                    className={styles.editLink}
                  >
                    Редактировать
                  </Link>
                  <button
                    type="button"
                    className={styles.deleteButton}
                    onClick={() => setDeleteTarget({ id: promo.id, title: promo.title })}
                  >
                    Удалить
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Удалить акцию?"
          message={`Вы уверены, что хотите удалить акцию «${deleteTarget.title}»?`}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}
    </div>
  );
}
