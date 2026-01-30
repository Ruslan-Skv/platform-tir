'use client';

import { useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';

import styles from './FeaturedProductsSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type PrimaryFilter = 'featured' | 'new' | 'featured_or_new' | 'any';
type SecondaryOrder = 'sort_order' | 'created_desc';

interface FeaturedProductsBlock {
  title: string;
  subtitle: string;
  limit: number;
  primaryFilter: PrimaryFilter;
  secondaryOrder: SecondaryOrder;
}

export function FeaturedProductsSectionPage() {
  const { getAuthHeaders } = useAuth();
  const [data, setData] = useState<FeaturedProductsBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_URL}/admin/home/featured-products`, {
          headers: getAuthHeaders(),
        });
        if (!cancelled && res.ok) {
          const d = await res.json();
          setData({
            ...d,
            primaryFilter: d.primaryFilter ?? 'featured',
            secondaryOrder: d.secondaryOrder ?? 'sort_order',
          });
        }
      } catch (e) {
        if (!cancelled) {
          console.error(e);
          showMessage('error', 'Ошибка загрузки');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [getAuthHeaders]);

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/home/featured-products`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        showMessage('success', 'Изменения успешно сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof FeaturedProductsBlock, value: string | number) => {
    if (!data) return;
    setData({ ...data, [field]: value });
  };

  if (loading || !data) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Популярные товары</h1>
        <p className={styles.subtitle}>
          Настройки блока «Популярные товары» на главной странице. Можно выбрать, какие товары
          показывать первыми и как сортировать остальные.
        </p>
      </header>

      {message && (
        <div
          className={`${message.type === 'success' ? styles.success : styles.error} ${styles.toast}`}
        >
          {message.text}
        </div>
      )}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Настройки блока</h2>
        <div className={styles.formGroup}>
          <label>Заголовок</label>
          <input
            type="text"
            value={data.title}
            onChange={(e) => handleChange('title', e.target.value)}
            className={styles.input}
            placeholder="Популярные товары"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Подзаголовок</label>
          <input
            type="text"
            value={data.subtitle}
            onChange={(e) => handleChange('subtitle', e.target.value)}
            className={styles.input}
            placeholder="Товары, которые выбирают наши клиенты"
          />
        </div>
        <div className={styles.formGroup}>
          <label>Показывать первыми</label>
          <select
            value={data.primaryFilter}
            onChange={(e) => handleChange('primaryFilter', e.target.value as PrimaryFilter)}
            className={styles.input}
          >
            <option value="featured">Хит (помеченные как «Хит продаж»)</option>
            <option value="new">Новинка (помеченные как «Новинка»)</option>
            <option value="featured_or_new">Хит или новинка</option>
            <option value="any">Любые (без приоритета)</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Сортировка остальных товаров</label>
          <select
            value={data.secondaryOrder}
            onChange={(e) => handleChange('secondaryOrder', e.target.value as SecondaryOrder)}
            className={styles.input}
          >
            <option value="sort_order">По порядку сортировки</option>
            <option value="created_desc">По дате добавления (сначала новые)</option>
          </select>
        </div>
        <div className={styles.formGroup}>
          <label>Количество товаров (1–24)</label>
          <input
            type="number"
            min={1}
            max={24}
            value={data.limit}
            onChange={(e) => {
              const v = parseInt(e.target.value, 10);
              handleChange('limit', Number.isNaN(v) ? 8 : Math.min(24, Math.max(1, v)));
            }}
            className={styles.input}
            style={{ maxWidth: 120 }}
          />
        </div>
        <div className={styles.saveBlock}>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnPrimary}`}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </section>
    </div>
  );
}
