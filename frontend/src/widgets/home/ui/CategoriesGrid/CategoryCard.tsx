import React from 'react';

import type { Category } from '../../lib/constants';
import styles from './CategoriesGrid.module.css';

interface CategoryCardProps {
  category: Category;
  onClick: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({ category, onClick }) => {
  return (
    <button
      type="button"
      className={`${styles.card} ${category.isSale ? styles.saleCard : ''}`}
      onClick={onClick}
    >
      <div
        className={styles.cardImage}
        style={category.image ? { backgroundImage: `url(${category.image})` } : undefined}
      >
        {category.isSale && <span className={styles.saleBadge}>Акция</span>}
      </div>
      <div className={styles.cardContent}>
        <h3 className={styles.cardTitle}>{category.name}</h3>
        <p className={styles.cardDescription}>{category.description}</p>
        <div className={styles.cardFooter}>
          <span className={styles.productCount}>{category.productCount} товаров</span>
          <span className={styles.arrow}>→</span>
        </div>
      </div>
    </button>
  );
};
