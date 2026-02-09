'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { type Category, categories } from '../../lib/constants';
import { DEFAULT_DIRECTION_IMAGES } from '../../lib/constants/homeConstants';
import styles from './CategoriesGrid.module.css';
import { CategoryCard } from './CategoryCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  const router = useRouter();
  // Стартуем с дефолтных картинок (локальные пути), чтобы при остановленном бэкенде
  // не рендерить URL с localhost:3001 и не получать ERR_CONNECTION_REFUSED в консоли.
  const [directionImages, setDirectionImages] = useState<Record<string, string>>(
    () => DEFAULT_DIRECTION_IMAGES
  );

  useEffect(() => {
    fetch(`${API_URL}/home/directions/images`)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Not ok'))))
      .then((data: Record<string, string>) => {
        const next = data && typeof data === 'object' ? data : {};
        const hasAnyImages = Object.keys(next).length > 0;
        if (hasAnyImages) {
          setStoredDirectionImages(next);
          setDirectionImages(next);
        }
      })
      .catch(() => {
        // При недоступности бэкенда используем только локальные картинки из констант,
        // чтобы не запрашивать http://localhost:3001/uploads/... (ERR_CONNECTION_REFUSED).
        setDirectionImages(DEFAULT_DIRECTION_IMAGES);
      });
  }, []);

  const categoriesWithImages: Category[] = categories.map((cat) => ({
    ...cat,
    image: directionImages[cat.slug] || cat.image,
  }));

  const handleCategoryClick = (href: string) => {
    router.push(href);
  };

  return (
    <section className={styles.categories}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Наши направления</h2>
          <p className={styles.subtitle}>Полный спектр услуг для вашего интерьера</p>
        </div>

        <div className={styles.grid}>
          {categoriesWithImages.map((category) => (
            <CategoryCard
              key={category.id}
              category={category}
              onClick={() => handleCategoryClick(category.href)}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
