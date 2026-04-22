'use client';

import React from 'react';
import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { getSafeHref } from '@/shared/lib/sanitize';
import { serviceCatalogIconMap } from '@/shared/lib/serviceCatalogIcons';

import styles from './ServiceCatalogPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ServiceCatalogItem {
  id: string;
  name: string;
  description?: string | null;
  unit: string;
  price?: number;
}

interface ServiceCatalogCategory {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  icon?: string | null;
  image?: string | null;
  cardBackgroundImage?: string | null;
  items: ServiceCatalogItem[];
  children?: ServiceCatalogCategory[];
  /** Всего видов работ в этой категории и во всех вложенных */
  totalWorkTypes?: number;
}

interface CatalogData {
  block: { title: string };
  categories: ServiceCatalogCategory[];
}

export function ServiceCatalogPage() {
  const [data, setData] = useState<CatalogData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/service-catalog`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        setData(null);
      }
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка...</p>
      </div>
    );
  }

  if (!data || data.categories.length === 0) {
    return (
      <div className={styles.page}>
        <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
          <Link href="/" className={styles.breadcrumbLink}>
            Главная
          </Link>
          <span className={styles.breadcrumbSep}>/</span>
          <span className={styles.breadcrumbCurrent}>{data?.block?.title ?? 'Ремонт квартир'}</span>
        </nav>
        <h1 className={styles.title}>{data?.block?.title ?? 'Ремонт квартир'}</h1>
        <p className={styles.empty}>
          Раздел в разработке. Скоро здесь появится каталог видов работ.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <nav className={styles.breadcrumbs} aria-label="Хлебные крошки">
        <Link href="/" className={styles.breadcrumbLink}>
          Главная
        </Link>
        <span className={styles.breadcrumbSep}>/</span>
        <span className={styles.breadcrumbCurrent}>{data.block.title}</span>
      </nav>
      <div className={styles.mainContent}>
        <h1 className={styles.title}>{data.block.title}</h1>
        <div className={styles.grid}>
          {data.categories.map((cat) => {
            const IconComponent = !cat.image && cat.icon ? serviceCatalogIconMap[cat.icon] : null;
            const positionCount = cat.totalWorkTypes ?? cat.items.length;
            const cardBg = cat.cardBackgroundImage?.trim();
            return (
              <Link
                key={cat.id}
                href={getSafeHref(`/catalog/services/${cat.slug}`)}
                className={`${styles.categoryCard} ${cardBg ? styles.categoryCardHasBg : ''}`}
                style={cardBg ? { backgroundImage: `url(${cardBg})` } : undefined}
              >
                {cardBg ? <span className={styles.categoryCardBgScrim} aria-hidden /> : null}
                <div className={styles.categoryCardMain}>
                  {cat.image ? (
                    <span className={styles.categoryCardIcon}>
                      <img src={cat.image} alt="" className={styles.categoryCardImage} />
                    </span>
                  ) : IconComponent ? (
                    <span className={styles.categoryCardIcon}>
                      <IconComponent className={styles.categoryCardIconSvg} />
                    </span>
                  ) : null}
                  <div className={styles.categoryCardText}>
                    <h2 className={styles.categoryCardTitle}>{cat.name}</h2>
                    {positionCount > 0 ? (
                      <span className={styles.categoryCardCount}>{positionCount}</span>
                    ) : null}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
