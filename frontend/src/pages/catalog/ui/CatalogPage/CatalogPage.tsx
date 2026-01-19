'use client';

import React, { useState } from 'react';

import { Breadcrumbs } from '../Breadcrumbs';
import { FiltersSidebar } from '../FiltersSidebar';
import { Pagination } from '../Pagination';
import { ProductsGrid } from '../ProductsGrid';
import styles from './CatalogPage.module.css';

export interface CatalogPageProps {
  categorySlug?: string;
  categoryName?: string;
  parentCategoryName?: string;
  parentCategorySlug?: string;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  categorySlug,
  categoryName = 'Каталог',
  parentCategoryName,
  parentCategorySlug,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.catalogPage}>
      {/* 1. Верхний ряд - хлебные крошки */}
      <div className={styles.breadcrumbsSection}>
        <Breadcrumbs
          categoryName={categoryName}
          parentCategoryName={parentCategoryName}
          parentCategorySlug={parentCategorySlug}
        />
      </div>

      {/* 2. Основной контент - фильтры и товары */}
      <div className={styles.mainContent}>
        {/* Левая колонка - фильтры */}
        <aside className={styles.filtersSidebar}>
          <FiltersSidebar />
        </aside>

        {/* Правая колонка - товары */}
        <main className={styles.productsSection}>
          <ProductsGrid
            categorySlug={categorySlug}
            categoryName={categoryName}
            currentPage={currentPage}
            onTotalPagesChange={setTotalPages}
          />
        </main>
      </div>

      {/* 3. Нижний ряд - пагинация */}
      {totalPages > 1 && (
        <div className={styles.paginationSection}>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};
