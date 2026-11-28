'use client';

import React from 'react';

import { useActiveSiteDecoration } from '@/shared/lib/contexts/SitePublicConfigContext';

import styles from './MobileGarland.module.css';

/**
 * Новогоднее украшение мобильной версии: ветка «шары и шишки» в правом нижнем
 * углу экрана, вплотную над нижним меню (сверху, в шапке, она перекрывала бы
 * кнопки). Живёт внутри нижнего меню и позиционируется от его верхней кромки,
 * поэтому показывается ровно там, где само меню (≤768px), на десктопе её нет.
 * pointer-events: none — кликам не мешает.
 *
 * Включается отдельным чек-боксом в админке и не зависит от гирлянд в шапке.
 */
export function MobileGarland() {
  const decoration = useActiveSiteDecoration('new-year-garland-mobile');
  if (!decoration) return null;

  return <div className={styles.garland} aria-hidden="true" />;
}
