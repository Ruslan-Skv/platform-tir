'use client';

import React from 'react';

import { useActiveSiteDecoration } from '@/shared/lib/contexts/SitePublicConfigContext';

import styles from './Garland.module.css';

/**
 * Новогоднее украшение: гирлянда вдоль нижней кромки шапки публичного сайта
 * (сразу под меню навигации). Живёт внутри пилюли меню, поэтому едет вместе
 * с шапкой при прокрутке и занимает ровно её ширину. pointer-events: none —
 * кликам не мешает. На мобильных (≤768px) не отображается.
 *
 * Варианты (выбор в админке):
 *  - 'lights'  — сплошная нить с лампочками на всю ширину меню;
 *  - 'baubles' — ветка с шарами и шишками у правого края меню.
 */
export function Garland() {
  const decoration = useActiveSiteDecoration('new-year-garland');
  if (!decoration) return null;

  if (decoration.variant === 'baubles') {
    // только правая ветка: левая перекрывала хлебные крошки под шапкой
    return (
      <div
        className={`${styles.garland} ${styles.baubles} ${styles.baublesRight}`}
        aria-hidden="true"
      />
    );
  }

  return <div className={styles.garland} aria-hidden="true" />;
}
