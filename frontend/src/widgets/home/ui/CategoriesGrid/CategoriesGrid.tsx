'use client';

import React, { useEffect, useState } from 'react';

import { useHomeDirectionsImages } from '@/shared/lib/hooks/useHomePageData';

import { type Category, categories } from '../../lib/constants';
import { DEFAULT_DIRECTION_IMAGES } from '../../lib/constants/homeConstants';
import styles from './CategoriesGrid.module.css';
import { CategoryCard } from './CategoryCard';

const DIRECTIONS_IMAGES_STORAGE_KEY = 'platform-tir:home-directions-images';

function getStoredDirectionImages(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(DIRECTIONS_IMAGES_STORAGE_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function setStoredDirectionImages(data: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DIRECTIONS_IMAGES_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore
  }
}

export const CategoriesGrid: React.FC = () => {
  // Дефолты на SSR и первом клиентском кадре — иначе localStorage/React Query дают другие URL и ломают гидрацию.
  const [directionImages, setDirectionImages] = useState<Record<string, string>>(
    () => DEFAULT_DIRECTION_IMAGES
  );
  const { data: fetchedImages } = useHomeDirectionsImages();

  useEffect(() => {
    if (fetchedImages && Object.keys(fetchedImages).length > 0) {
      setStoredDirectionImages(fetchedImages);
      setDirectionImages(fetchedImages);
      return;
    }
    const stored = getStoredDirectionImages();
    if (Object.keys(stored).length > 0) {
      setDirectionImages(stored);
    }
  }, [fetchedImages]);

  const categoriesWithImages: Category[] = categories.map((cat) => ({
    ...cat,
    image: directionImages[cat.slug] || cat.image,
  }));

  return (
    <section className={styles.categories}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Наши направления</h2>
          <p className={styles.subtitle}>Полный спектр услуг для вашего интерьера</p>
        </div>

        <div className={styles.grid}>
          {categoriesWithImages.map((category) => (
            <CategoryCard key={category.id} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
};
