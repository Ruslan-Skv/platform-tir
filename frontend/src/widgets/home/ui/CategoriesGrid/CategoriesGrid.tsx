'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import { type Category, categories } from '../../lib/constants';
import styles from './CategoriesGrid.module.css';
import { CategoryCard } from './CategoryCard';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export const CategoriesGrid: React.FC = () => {
  const router = useRouter();
  const [directionImages, setDirectionImages] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch(`${API_URL}/home/directions/images`)
      .then((res) => (res.ok ? res.json() : {}))
      .then((data: Record<string, string>) => setDirectionImages(data || {}))
      .catch(() => {});
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
