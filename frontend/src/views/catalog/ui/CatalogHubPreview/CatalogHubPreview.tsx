'use client';

import { FunnelIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import type { Product } from '@/entities/product/types';
import type {
  CatalogHubPreviewMode,
  CatalogHubPreviewResponse,
} from '@/shared/api/catalog-hub-preview';
import { apiFetch } from '@/shared/lib/api-fetch';
import { useMobileCatalogColumns } from '@/shared/lib/hooks';
import { mapCatalogApiProductToProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';
import { useCatalogHubPreview } from '@/views/catalog/lib/useCatalogHubPreview';
import { ProductCard } from '@/views/catalog/ui/ProductsGrid';
import gridStyles from '@/views/catalog/ui/ProductsGrid/ProductsGrid.module.css';

import styles from './CatalogHubPreview.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface CatalogHubPreviewProps {
  categoryName?: string;
  initialPreview?: CatalogHubPreviewResponse | null;
  showMobileFiltersButton?: boolean;
  onMobileFiltersOpen?: () => void;
  onPreviewReady?: (ready: boolean) => void;
}

export const CatalogHubPreview: React.FC<CatalogHubPreviewProps> = ({
  categoryName = 'Каталог',
  initialPreview = null,
  showMobileFiltersButton = false,
  onMobileFiltersOpen,
  onPreviewReady,
}) => {
  const [mode, setMode] = useState<CatalogHubPreviewMode>(initialPreview?.mode ?? 'featured');
  const { data, isLoading, isFetching } = useCatalogHubPreview(mode, initialPreview);
  const mobileCatalogColumns = useMobileCatalogColumns();

  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchPartnerSettings = async () => {
      try {
        const res = await apiFetch(`${API_URL}/home/partner-products`);
        if (res.ok) {
          const partnerData = await res.json();
          setPartnerSettings({
            partnerLogoUrl: partnerData.partnerLogoUrl ?? null,
            showPartnerIconOnCards: partnerData.showPartnerIconOnCards ?? true,
          });
        }
      } catch {
        // ignore
      }
    };
    fetchPartnerSettings();
  }, []);

  const sections = data?.sections ?? [];
  const loading = isLoading && !data;
  const hasProducts = sections.some((section) => section.products.length > 0);

  useEffect(() => {
    onPreviewReady?.(!loading && hasProducts);
  }, [loading, hasProducts, onPreviewReady]);

  const gridClassName = `${gridStyles.grid} ${
    mobileCatalogColumns === 2 ? gridStyles.gridMobile2 : ''
  }`;

  return (
    <div className={styles.hubPreview}>
      <div className={styles.header}>
        <div className={styles.titleBlock}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{categoryName}</h1>
            {showMobileFiltersButton && onMobileFiltersOpen ? (
              <button
                type="button"
                className={styles.mobileFiltersButton}
                onClick={onMobileFiltersOpen}
                aria-label="Открыть фильтры"
              >
                <FunnelIcon className={styles.mobileFiltersIcon} aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <div className={styles.modeToggle} role="tablist" aria-label="Режим превью каталога">
          <button
            type="button"
            role="tab"
            className={styles.modeButton}
            data-active={mode === 'featured'}
            aria-selected={mode === 'featured'}
            onClick={() => setMode('featured')}
          >
            Популярное
          </button>
          <button
            type="button"
            role="tab"
            className={styles.modeButton}
            data-active={mode === 'new'}
            aria-selected={mode === 'new'}
            onClick={() => setMode('new')}
          >
            Новинки
          </button>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Загрузка…</div>
      ) : sections.length === 0 ? (
        <div className={styles.empty}>
          Выберите категорию в фильтрах слева или настройте разделы превью в админке.
        </div>
      ) : (
        sections.map((section) => {
          const products: Product[] = section.products.map((product, index) =>
            mapCatalogApiProductToProduct(product, index)
          );
          if (products.length === 0) return null;

          return (
            <section
              key={section.id}
              className={styles.section}
              aria-labelledby={`hub-section-${section.id}`}
            >
              <div className={styles.sectionHeader}>
                <h2 id={`hub-section-${section.id}`} className={styles.sectionTitle}>
                  {section.categoryName}
                </h2>
                <Link href={section.viewAllUrl} className={styles.viewAllLink}>
                  Смотреть все →
                </Link>
              </div>
              <div className={gridClassName}>
                {products.map((product) => (
                  <ProductCard
                    key={product.originalId ?? product.id}
                    product={product}
                    partnerLogoUrl={partnerSettings.partnerLogoUrl}
                    showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      {isFetching && data ? (
        <p className={styles.loading} aria-live="polite">
          Обновление…
        </p>
      ) : null}
    </div>
  );
};
