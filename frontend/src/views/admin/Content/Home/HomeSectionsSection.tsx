'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import {
  getAdminHomeSectionsVisibility,
  updateAdminHomeSectionsVisibility,
} from '@/shared/api/home-sections';
import {
  type HomeSectionDesktopKey,
  type HomeSectionMobileKey,
  normalizeHomeSectionsVisibility,
} from '@/shared/lib/home-sections-visibility';

import styles from './HomeSectionsSection.module.css';

const SECTIONS: Array<{
  desktopKey: HomeSectionDesktopKey;
  mobileKey: HomeSectionMobileKey;
  title: string;
  description: string;
  href: string;
}> = [
  {
    desktopKey: 'heroVisible',
    mobileKey: 'heroMobileVisible',
    title: 'Первый блок',
    description: 'Слайдер, заголовки и преимущества в шапке главной страницы',
    href: '/admin/content/hero',
  },
  {
    desktopKey: 'directionsVisible',
    mobileKey: 'directionsMobileVisible',
    title: 'Наши направления',
    description: 'Направления деятельности с изображениями',
    href: '/admin/content/directions',
  },
  {
    desktopKey: 'advantagesVisible',
    mobileKey: 'advantagesMobileVisible',
    title: 'Почему выбирают нас',
    description: 'Блок с преимуществами компании',
    href: '/admin/content/advantages',
  },
  {
    desktopKey: 'servicesVisible',
    mobileKey: 'servicesMobileVisible',
    title: 'Комплексные решения',
    description: 'Услуги и тарифы',
    href: '/admin/content/services',
  },
  {
    desktopKey: 'featuredProductsVisible',
    mobileKey: 'featuredProductsMobileVisible',
    title: 'Популярные товары',
    description: 'Заголовок, подзаголовок и количество товаров',
    href: '/admin/content/featured-products',
  },
  {
    desktopKey: 'contactFormVisible',
    mobileKey: 'contactFormMobileVisible',
    title: 'Контактная форма',
    description: 'Заголовок и подзаголовок блока с кнопками заявки',
    href: '/admin/content/contact-form',
  },
];

interface HomeSectionsSectionProps {
  onSaveStart?: () => void;
  onSaveSuccess?: () => void;
  onSaveError?: (message: string) => void;
}

export function HomeSectionsSection({
  onSaveStart,
  onSaveSuccess,
  onSaveError,
}: HomeSectionsSectionProps) {
  const [visibility, setVisibility] = useState<HomeSectionsVisibility | null>(null);
  const [loading, setLoading] = useState(true);

  const loadVisibility = useCallback(async () => {
    try {
      const data = await getAdminHomeSectionsVisibility();
      setVisibility(normalizeHomeSectionsVisibility(data));
    } catch (err) {
      console.error(err);
      setVisibility(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVisibility();
  }, [loadVisibility]);

  const handleToggle = async (key: keyof HomeSectionsVisibility, value: boolean) => {
    if (!visibility) return;
    const next = { ...visibility, [key]: value };
    setVisibility(next);
    onSaveStart?.();
    try {
      await updateAdminHomeSectionsVisibility({ [key]: value });
      onSaveSuccess?.();
    } catch (err) {
      setVisibility(visibility);
      onSaveError?.(err instanceof Error ? err.message : 'Ошибка сохранения');
    }
  };

  if (loading || !visibility) {
    return (
      <div className={styles.section}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Видимость секций на главной странице</h2>
      <p className={styles.sectionDescription}>
        Для каждой секции можно отдельно управлять отображением на десктопе и на мобильных
        устройствах. Отключённые секции не будут показаны на сайте, но их контент можно
        редактировать — они появятся после включения.
      </p>
      <div className={styles.grid}>
        {SECTIONS.map(({ desktopKey, mobileKey, title, description, href }) => {
          const desktopVisible = visibility[desktopKey];
          const mobileVisible = visibility[mobileKey];
          const isFullyHidden = !desktopVisible && !mobileVisible;

          return (
            <div key={desktopKey} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.toggles}>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={desktopVisible}
                      onChange={(e) => handleToggle(desktopKey, e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.toggleText}>Десктоп</span>
                  </label>
                  <label className={styles.toggleLabel}>
                    <input
                      type="checkbox"
                      checked={mobileVisible}
                      onChange={(e) => handleToggle(mobileKey, e.target.checked)}
                      className={styles.checkbox}
                    />
                    <span className={styles.toggleText}>Мобильные</span>
                  </label>
                  <span className={styles.statusText}>
                    {isFullyHidden
                      ? 'Скрыто'
                      : desktopVisible && mobileVisible
                        ? 'Везде'
                        : 'Частично'}
                  </span>
                </div>
                <Link href={href} className={styles.editLink}>
                  Редактировать →
                </Link>
              </div>
              <Link href={href} className={styles.cardContent}>
                <h3 className={styles.cardTitle}>{title}</h3>
                <p className={styles.cardDescription}>{description}</p>
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}
