'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import type { HomeSectionsVisibility } from '@/shared/api/home-sections';
import {
  getAdminHomeSectionsVisibility,
  updateAdminHomeSectionsVisibility,
} from '@/shared/api/home-sections';

import styles from './HomeSectionsSection.module.css';

const SECTION_KEYS: Array<{
  key: keyof HomeSectionsVisibility;
  title: string;
  description: string;
  href: string;
}> = [
  {
    key: 'heroVisible',
    title: 'Первый блок',
    description: 'Слайдер, заголовки и преимущества в шапке главной страницы',
    href: '/admin/content/hero',
  },
  {
    key: 'directionsVisible',
    title: 'Наши направления',
    description: 'Направления деятельности с изображениями',
    href: '/admin/content/directions',
  },
  {
    key: 'advantagesVisible',
    title: 'Почему выбирают нас',
    description: 'Блок с преимуществами компании',
    href: '/admin/content/advantages',
  },
  {
    key: 'servicesVisible',
    title: 'Комплексные решения',
    description: 'Услуги и тарифы',
    href: '/admin/content/services',
  },
  {
    key: 'featuredProductsVisible',
    title: 'Популярные товары',
    description: 'Заголовок, подзаголовок и количество товаров',
    href: '/admin/content/featured-products',
  },
  {
    key: 'contactFormVisible',
    title: 'Контактная форма',
    description: 'Заголовок и подзаголовок блока с кнопками заявки',
    href: '/admin/content/contact-form',
  },
];

export function HomeSectionsSection() {
  const [visibility, setVisibility] = useState<HomeSectionsVisibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadVisibility = useCallback(async () => {
    try {
      const data = await getAdminHomeSectionsVisibility();
      setVisibility(data);
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
    setSaving(true);
    setToast(null);
    try {
      await updateAdminHomeSectionsVisibility({ [key]: value });
      showToast('Настройки сохранены', 'success');
    } catch (err) {
      setVisibility(visibility);
      showToast(err instanceof Error ? err.message : 'Ошибка сохранения', 'error');
    } finally {
      setSaving(false);
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
        Отключённые секции не будут отображаться на главной странице сайта. Вы по-прежнему можете
        редактировать контент отключённых секций — они появятся после включения.
      </p>
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}>{toast.message}</div>}
      <div className={styles.grid}>
        {SECTION_KEYS.map(({ key, title, description, href }) => (
          <div key={key} className={styles.card}>
            <div className={styles.cardHeader}>
              <label className={styles.toggleLabel}>
                <input
                  type="checkbox"
                  checked={visibility[key]}
                  onChange={(e) => handleToggle(key, e.target.checked)}
                  disabled={saving}
                  className={styles.checkbox}
                />
                <span className={styles.toggleText}>
                  {visibility[key] ? 'Показывать' : 'Скрыто'}
                </span>
              </label>
              <Link href={href} className={styles.editLink}>
                Редактировать →
              </Link>
            </div>
            <Link href={href} className={styles.cardContent}>
              <h3 className={styles.cardTitle}>{title}</h3>
              <p className={styles.cardDescription}>{description}</p>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
