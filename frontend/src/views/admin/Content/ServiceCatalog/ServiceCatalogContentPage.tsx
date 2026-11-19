'use client';

import Link from 'next/link';

import { ServiceCatalogBlockSettingsPanel } from './ServiceCatalogBlockSettingsPanel';
import styles from './ServiceCatalogBlockSettingsPanel.module.css';
import { useServiceCatalogBlockSettings } from './hooks/useServiceCatalogBlockSettings';

/** Страница «Контент → Ремонт квартир»: настройки публичной страницы /catalog/services. */
export function ServiceCatalogContentPage() {
  const model = useServiceCatalogBlockSettings();

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Ремонт квартир</h1>
        <div className={styles.pageHeaderActions}>
          <Link
            href="/catalog/services"
            target="_blank"
            rel="noreferrer"
            className={styles.viewLink}
          >
            Просмотр на сайте
          </Link>
        </div>
      </div>

      <ServiceCatalogBlockSettingsPanel model={model} />
    </div>
  );
}
