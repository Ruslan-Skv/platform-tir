'use client';

import Link from 'next/link';

import styles from './PromotionsPage.module.css';
import type { PromotionsPageModel } from './hooks/usePromotionsPage';

type PromotionsPageViewProps = {
  model: PromotionsPageModel;
};

export function PromotionsPageView({ model }: PromotionsPageViewProps) {
  const { promotions, loading, getImageUrl } = model;

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <ol className={styles.breadcrumbsList}>
          <li>
            <Link href="/">Главная</Link>
            <span className={styles.separator}>/</span>
          </li>
          <li>
            <span className={styles.current}>Акции</span>
          </li>
        </ol>
      </nav>

      <header className={styles.header}>
        <h1 className={styles.title}>Акции</h1>
        <p className={styles.subtitle}>
          Специальные предложения и выгодные условия от Территории интерьерных решений
        </p>
      </header>

      {loading ? (
        <p className={styles.loading}>Загрузка акций...</p>
      ) : promotions.length === 0 ? (
        <p className={styles.empty}>Акций пока нет. Следите за обновлениями!</p>
      ) : (
        <div className={styles.list}>
          {promotions.map((promo, index) => (
            <article
              key={promo.id}
              className={`${styles.card} ${index % 2 === 1 ? styles.cardReversed : ''}`}
            >
              <div className={styles.cardImage}>
                <img src={getImageUrl(promo.imageUrl)} alt={promo.title} />
              </div>
              <div className={styles.cardContent}>
                <h2 className={styles.cardTitle}>{promo.title}</h2>
                {promo.description && <p className={styles.cardDescription}>{promo.description}</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
