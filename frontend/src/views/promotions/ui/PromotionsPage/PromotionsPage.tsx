'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { Promotion } from '@/shared/api/promotions';
import { getPromotions } from '@/shared/api/promotions';

import styles from './PromotionsPage.module.css';

export const PromotionsPage: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPromotions();
      setPromotions(data);
    } catch {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const getImageUrl = (url: string) => {
    if (url.startsWith('http')) return url;
    // /uploads/* — с бэкенда; /images/* — из public фронтенда
    if (url.startsWith('/uploads/')) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      return `${apiUrl.replace(/\/$/, '')}${url}`;
    }
    return url; // /images/* — относительный путь, резолвится на фронтенд
  };

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
};
