'use client';

import React, { useMemo } from 'react';

import styles from './Pagination.module.css';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/** Не рендерить сотни кнопок — на «все товары» ширина ломала мобильную вёрстку. */
const MAX_ALL_PAGE_BUTTONS = 9;

type PageSlot = number | 'ellipsis';

function buildPageSlots(totalPages: number, currentPage: number): PageSlot[] {
  if (totalPages <= MAX_ALL_PAGE_BUTTONS) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>();
  set.add(1);
  set.add(totalPages);
  const windowRadius = 2;
  for (let p = currentPage - windowRadius; p <= currentPage + windowRadius; p++) {
    if (p >= 1 && p <= totalPages) set.add(p);
  }
  const sorted = [...set].sort((a, b) => a - b);
  const out: PageSlot[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      out.push('ellipsis');
    }
    out.push(sorted[i]);
  }
  return out;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
}) => {
  const handlePrev = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const slots = useMemo(() => buildPageSlots(totalPages, currentPage), [totalPages, currentPage]);

  return (
    <nav className={styles.pagination} aria-label="Пагинация">
      <button
        type="button"
        className={styles.prevButton}
        disabled={currentPage === 1}
        onClick={handlePrev}
        aria-label="Предыдущая страница"
      >
        Назад
      </button>

      <div className={styles.pages}>
        {slots.map((slot, idx) =>
          slot === 'ellipsis' ? (
            <span key={`e-${idx}`} className={styles.ellipsis} aria-hidden>
              …
            </span>
          ) : (
            <button
              key={slot}
              type="button"
              className={`${styles.pageButton} ${slot === currentPage ? styles.active : ''}`}
              onClick={() => onPageChange(slot)}
              aria-label={`Страница ${slot}`}
              aria-current={slot === currentPage ? 'page' : undefined}
            >
              {slot}
            </button>
          )
        )}
      </div>

      <button
        type="button"
        className={styles.nextButton}
        disabled={currentPage === totalPages}
        onClick={handleNext}
        aria-label="Следующая страница"
      >
        Вперед
      </button>
    </nav>
  );
};
