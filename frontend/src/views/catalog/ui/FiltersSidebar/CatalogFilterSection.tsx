'use client';

import { ChevronDownIcon } from '@heroicons/react/24/outline';

import type { ReactNode } from 'react';

import styles from './FiltersSidebar.module.css';

type CatalogFilterSectionProps = {
  sectionId: string;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function CatalogFilterSection({
  sectionId,
  title,
  isOpen,
  onToggle,
  children,
}: CatalogFilterSectionProps) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionHeaderRow}>
        <h3 className={styles.sectionTitle} id={`filter-heading-${sectionId}`}>
          {title}
        </h3>
        <button
          type="button"
          className={styles.sectionToggle}
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={`filter-body-${sectionId}`}
          title={isOpen ? 'Свернуть' : 'Развернуть'}
        >
          <ChevronDownIcon
            className={`${styles.sectionChevron} ${!isOpen ? styles.sectionChevronCollapsed : ''}`}
            aria-hidden
          />
        </button>
      </div>
      {isOpen ? (
        <div
          className={styles.sectionBody}
          id={`filter-body-${sectionId}`}
          role="region"
          aria-labelledby={`filter-heading-${sectionId}`}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
