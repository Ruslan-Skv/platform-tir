'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { categories } from '../../lib/constants';
import styles from './CategoriesGrid.module.css';
import { CategoryCard } from './CategoryCard';

export const CategoriesGrid: React.FC = () => {
  const router = useRouter();

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
          {categories.map(category => (
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

