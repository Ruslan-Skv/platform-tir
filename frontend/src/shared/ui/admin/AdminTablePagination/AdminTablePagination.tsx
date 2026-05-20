'use client';

import styles from '../DataTable/DataTable.module.css';

export type AdminTablePaginationProps = {
  page: number;
  limit: number;
  total: number;
  onPageChange: (page: number) => void;
  className?: string;
  activePageClassName?: string;
};

export function AdminTablePagination({
  page,
  limit,
  total,
  onPageChange,
  className,
  activePageClassName,
}: AdminTablePaginationProps) {
  const totalPages = Math.ceil(total / limit);
  if (total <= 0) return null;

  return (
    <div className={[styles.pagination, className].filter(Boolean).join(' ')}>
      <span className={styles.paginationInfo}>
        {totalPages > 1 ? (
          <>
            Показано {(page - 1) * limit + 1} - {Math.min(page * limit, total)} из {total}
          </>
        ) : (
          <>Всего: {total}</>
        )}
      </span>
      {totalPages > 1 && (
        <div className={styles.paginationButtons}>
          <button
            type="button"
            className={styles.pageButton}
            disabled={page === 1}
            onClick={() => onPageChange(page - 1)}
          >
            ←
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            let pageNum: number;
            if (totalPages <= 5) {
              pageNum = i + 1;
            } else if (page <= 3) {
              pageNum = i + 1;
            } else if (page >= totalPages - 2) {
              pageNum = totalPages - 4 + i;
            } else {
              pageNum = page - 2 + i;
            }
            return (
              <button
                key={pageNum}
                type="button"
                className={`${styles.pageButton} ${
                  pageNum === page ? (activePageClassName ?? styles.active) : ''
                }`}
                onClick={() => onPageChange(pageNum)}
              >
                {pageNum}
              </button>
            );
          })}
          <button
            type="button"
            className={styles.pageButton}
            disabled={page === totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  );
}
