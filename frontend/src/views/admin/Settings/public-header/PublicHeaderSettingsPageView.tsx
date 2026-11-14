'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import {
  getAdminSitePublicSettings,
  updateAdminSitePublicSettings,
} from '@/shared/api/admin-site-public';

import styles from './PublicHeaderSettingsPage.module.css';

type HeaderVariant = 'classic' | 'sticky';

const VARIANTS: Array<{ value: HeaderVariant; name: string; description: string }> = [
  {
    value: 'classic',
    name: 'Классическая',
    description:
      'Текущий вариант: шапка прокручивается вместе со страницей, в начале страницы — три ряда (поиск, логотип с кнопками, навигация).',
  },
  {
    value: 'sticky',
    name: 'Липкая с трансформацией при прокрутке',
    description:
      'Шапка залипает у верха экрана при прокрутке. Верхняя панель (поиск, избранное, корзина, профиль) плавно сворачивается, фон становится полупрозрачным «стеклянным» с размытием — по аналогии с myaudza.ru. На мобильных (≤768px) шапка не меняется: она уже фиксирована сверху.',
  },
];

export function PublicHeaderSettingsPageView() {
  const { user } = useAuth();
  const [headerVariant, setHeaderVariant] = useState<HeaderVariant | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getAdminSitePublicSettings();
      setHeaderVariant(data.headerVariant === 'sticky' ? 'sticky' : 'classic');
    } catch {
      setHeaderVariant(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!headerVariant) return;
    setSaving(true);
    setMessage(null);
    try {
      await updateAdminSitePublicSettings({ headerVariant });
      setMessage({ text: 'Настройки сохранены' });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  if (user?.role !== 'SUPER_ADMIN') {
    return (
      <div className={styles.page}>
        <p className={styles.accessDenied}>
          Настройка шапки публичного сайта доступна только супер-администратору.
        </p>
      </div>
    );
  }

  if (loading || !headerVariant) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Шапка публичного сайта</h1>
        <p className={styles.subtitle}>
          Выберите вариант шапки публичного сайта (601270.ru). Настройка влияет только на публичную
          часть, админка не меняется.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {message && (
          <div className={message.error ? styles.toastError : styles.toastSuccess}>
            {message.text}
          </div>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Вариант шапки</h2>
          <p className={styles.hint}>
            Классический вариант останется доступен: в любой момент можно переключиться обратно.
          </p>
          <div className={styles.variantList}>
            {VARIANTS.map(({ value, name, description }) => (
              <label key={value} className={styles.variantLabel}>
                <input
                  type="radio"
                  name="headerVariant"
                  value={value}
                  checked={headerVariant === value}
                  onChange={() => setHeaderVariant(value)}
                />
                <span className={styles.variantText}>
                  <span className={styles.variantName}>{name}</span>
                  <span className={styles.variantDescription}>{description}</span>
                </span>
              </label>
            ))}
          </div>
        </section>

        <div className={styles.actions}>
          <button data-admin-mutation type="submit" className={styles.saveButton} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          <Link href="/" target="_blank" rel="noreferrer" className={styles.previewLink}>
            Открыть публичку →
          </Link>
        </div>
      </form>
    </div>
  );
}
