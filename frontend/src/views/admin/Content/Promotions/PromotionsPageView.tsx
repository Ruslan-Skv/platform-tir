'use client';

import Link from 'next/link';

import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './PromotionsPage.module.css';
import type { PromotionsPageModel } from './hooks/usePromotionsPage';
import { getPromotionImageUrl } from './promotions-page.utils';

type PromotionsPageViewProps = {
  model: PromotionsPageModel;
};

export function PromotionsPageView({ model }: PromotionsPageViewProps) {
  const { promotions, loading, message, deleteTarget, setDeleteTarget, deleting, handleDelete } =
    model;

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
                <img src={getPromotionImageUrl(promo.imageUrl)} alt={promo.title} />
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
          isOpen
          title="Удалить акцию?"
          message={`Вы уверены, что хотите удалить акцию «${deleteTarget.title}»?`}
          onConfirm={handleDelete}
          onClose={() => setDeleteTarget(null)}
          confirmText={deleting ? 'Удаление...' : 'Удалить'}
          variant="danger"
        />
      )}
    </div>
  );
}
