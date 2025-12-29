import React from 'react';
import styles from './CatalogPage.module.css';
import { Breadcrumbs } from '../Breadcrumbs';
import { FiltersSidebar } from '../FiltersSidebar';
import { ProductsGrid } from '../ProductsGrid';
import { Pagination } from '../Pagination';

export const CatalogPage: React.FC = () => {
  return (
    <div className={styles.catalogPage}>
      {/* 1. Верхний ряд - хлебные крошки */}
      <div className={styles.breadcrumbsSection}>
        <Breadcrumbs />
      </div>

      {/* 2. Основной контент - фильтры и товары */}
      <div className={styles.mainContent}>
        {/* Левая колонка - фильтры */}
        <aside className={styles.filtersSidebar}>
          <FiltersSidebar />
        </aside>

        {/* Правая колонка - товары */}
        <main className={styles.productsSection}>
          <ProductsGrid />
        </main>
      </div>

      {/* 3. Нижний ряд - пагинация */}
      <div className={styles.paginationSection}>
        <Pagination />
      </div>
    </div>
  );
};

