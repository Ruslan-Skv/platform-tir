'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useState } from 'react';

import { Breadcrumbs } from '../Breadcrumbs';
import { FiltersSidebar } from '../FiltersSidebar';
import { Pagination } from '../Pagination';
import { ProductsGrid } from '../ProductsGrid';
import styles from './CatalogPage.module.css';

export interface CatalogPageProps {
  categorySlug?: string;
  categoryName?: string | null;
  parentCategoryName?: string;
  parentCategorySlug?: string;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  categorySlug,
  categoryName,
  parentCategoryName,
  parentCategorySlug,
}) => {
  const displayCategoryName = categoryName || categorySlug || 'Каталог';
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (mobileFiltersOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [mobileFiltersOpen]);

  useEffect(() => {
    setCurrentPage(1);
  }, [categorySlug]);

  useEffect(() => {
    if (totalPages > 0 && currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className={styles.catalogPage}>
      {/* 1. Верхний блок: крошки + кнопка «Фильтры» (рядом на мобильных) */}
      <div className={styles.topSection}>
        <div className={styles.breadcrumbsSection}>
          <Breadcrumbs
            categoryName={displayCategoryName}
            parentCategoryName={parentCategoryName}
            parentCategorySlug={parentCategorySlug}
          />
        </div>
        <div className={styles.mobileFiltersRow}>
          <button
            type="button"
            className={styles.mobileFiltersButton}
            onClick={() => setMobileFiltersOpen(true)}
            aria-label="Открыть фильтры"
          >
            <FunnelIcon className={styles.mobileFiltersButtonIcon} />
            Фильтры
          </button>
        </div>
      </div>

      {/* 2. Основной контент - фильтры и товары */}
      <div className={styles.mainContent}>
        {/* Десктоп: боковая панель фильтров */}
        <aside className={styles.filtersSidebar}>
          <FiltersSidebar />
        </aside>

        {/* Мобильные: оверлей с фильтрами (панель снизу) */}
        <div
          className={styles.filtersOverlay}
          data-open={mobileFiltersOpen}
          aria-hidden={!mobileFiltersOpen}
        >
          <div className={styles.filtersBackdrop} onClick={() => setMobileFiltersOpen(false)} />
          <div className={styles.filtersDrawer}>
            <FiltersSidebar
              mobileOpen={mobileFiltersOpen}
              onClose={() => setMobileFiltersOpen(false)}
            />
          </div>
        </div>

        {/* Колонка с товарами */}
        <main className={styles.productsSection}>
          <ProductsGrid
            categorySlug={categorySlug}
            categoryName={displayCategoryName}
            currentPage={currentPage}
            onTotalPagesChange={setTotalPages}
            onSortChange={() => setCurrentPage(1)}
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
