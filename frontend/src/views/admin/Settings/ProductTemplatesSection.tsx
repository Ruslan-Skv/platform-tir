'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import styles from './SettingsPage.module.css';

const TABLE_COLUMNS_STORAGE_KEY = 'admin_product_table_template_columns';
const CARD_SECTIONS_STORAGE_KEY = 'admin_product_card_template_sections';

const DEFAULT_TABLE_COLUMNS = ['price', 'stock', 'isActive'];

const TABLE_COLUMN_OPTIONS = [
  { key: 'price', label: 'Цена' },
  { key: 'comparePrice', label: 'Старая цена' },
  { key: 'supplierPrice', label: 'Цена поставщика' },
  { key: 'stock', label: 'Остаток' },
  { key: 'sortOrder', label: 'Сортировка' },
  { key: 'isActive', label: 'Активен' },
  { key: 'isFeatured', label: 'Хит' },
  { key: 'isNew', label: 'Новинка' },
  { key: 'isPartnerProduct', label: 'Товар партнёра' },
  { key: 'supplier', label: 'Поставщик' },
] as const;

const CARD_SECTION_OPTIONS = [
  { key: 'main', label: 'Основная информация', required: true },
  { key: 'pricing', label: 'Цена и наличие', required: true },
  { key: 'variants', label: 'Варианты исполнения (размеры, сторона открывания)', required: false },
  { key: 'seo', label: 'SEO', required: false },
  { key: 'images', label: 'Изображения', required: false },
  { key: 'description', label: 'Описание', required: false },
  { key: 'attributes', label: 'Характеристики товара', required: false },
  { key: 'components', label: 'Комплектующие', required: false },
] as const;

export function ProductTemplatesSection() {
  const [tableColumns, setTableColumns] = useState<string[]>(DEFAULT_TABLE_COLUMNS);
  const [cardSections, setCardSections] = useState<string[]>(
    CARD_SECTION_OPTIONS.map((o) => o.key)
  );
  const [saved, setSaved] = useState(false);

  const loadFromStorage = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedColumns = localStorage.getItem(TABLE_COLUMNS_STORAGE_KEY);
      if (storedColumns) {
        const parsed = JSON.parse(storedColumns);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setTableColumns(parsed);
        }
      }
      const storedSections = localStorage.getItem(CARD_SECTIONS_STORAGE_KEY);
      if (storedSections) {
        const parsed = JSON.parse(storedSections);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCardSections(parsed);
        }
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const saveTableColumns = () => {
    localStorage.setItem(TABLE_COLUMNS_STORAGE_KEY, JSON.stringify(tableColumns));
    localStorage.setItem('admin_products_columns', JSON.stringify(tableColumns));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveCardSections = () => {
    localStorage.setItem(CARD_SECTIONS_STORAGE_KEY, JSON.stringify(cardSections));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const toggleTableColumn = (key: string) => {
    setTableColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleCardSection = (key: string) => {
    const opt = CARD_SECTION_OPTIONS.find((o) => o.key === key);
    if (opt?.required) return;
    setCardSections((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const resetToDefaults = () => {
    setTableColumns([...DEFAULT_TABLE_COLUMNS]);
    setCardSections(CARD_SECTION_OPTIONS.map((o) => o.key));
    localStorage.removeItem(TABLE_COLUMNS_STORAGE_KEY);
    localStorage.removeItem(CARD_SECTIONS_STORAGE_KEY);
    localStorage.removeItem('admin_products_columns');
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className={styles.section}>
      <div className={styles.infoBlock}>
        <h3 className={styles.infoBlockTitle}>Как это работает</h3>
        <ol className={styles.infoBlockList}>
          <li>
            <strong>Шаблон таблицы</strong> — выберите колонки, которые будут отображаться в таблице
            товаров. При просмотре по категории добавляются атрибуты этой категории. Изменения
            применяются в разделе{' '}
            <Link href="/admin/catalog/products" className={styles.infoBlockLink}>
              Каталог → Товары
            </Link>
            .
          </li>
          <li>
            <strong>Шаблон карточки</strong> — выберите блоки формы редактирования товара. Блоки
            «Основная информация» и «Цена и наличие» обязательны. Изменения применяются при{' '}
            <Link href="/admin/catalog/products" className={styles.infoBlockLink}>
              редактировании товара
            </Link>
            .
          </li>
          <li>
            Нажмите <strong>«Сохранить»</strong> после изменений. Обновите страницу товаров, чтобы
            увидеть результат.
          </li>
        </ol>
      </div>

      <div className={styles.rolesGrid} style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className={styles.roleCard}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Шаблон таблицы товаров
          </h3>
          <p
            className={styles.sectionDescription}
            style={{ marginBottom: 16, fontSize: '0.875rem' }}
          >
            Выберите колонки по умолчанию для таблицы товаров. Атрибуты категории добавляются
            автоматически при просмотре по категории.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TABLE_COLUMN_OPTIONS.map((opt) => (
              <label key={opt.key} className={styles.templateCheckboxLabel}>
                <input
                  type="checkbox"
                  checked={tableColumns.includes(opt.key)}
                  onChange={() => toggleTableColumn(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveTableColumns}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Сохранить шаблон таблицы
          </button>
        </div>

        <div className={styles.roleCard}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: 12 }}>
            Шаблон карточки товара
          </h3>
          <p
            className={styles.sectionDescription}
            style={{ marginBottom: 16, fontSize: '0.875rem' }}
          >
            Выберите блоки формы редактирования товара. Блок «Характеристики» всегда показывает
            атрибуты выбранной категории.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {CARD_SECTION_OPTIONS.map((opt) => (
              <label
                key={opt.key}
                className={`${styles.templateCheckboxLabel} ${opt.required ? styles.templateCheckboxLabelDisabled : ''}`}
              >
                <input
                  type="checkbox"
                  checked={cardSections.includes(opt.key)}
                  onChange={() => toggleCardSection(opt.key)}
                  disabled={opt.required}
                  title={opt.required ? 'Обязательный блок — нельзя скрыть' : undefined}
                />
                {opt.label}
                {opt.required && (
                  <span className={styles.templateCheckboxLabelRequired}>(обязательно)</span>
                )}
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={saveCardSections}
            style={{
              marginTop: 16,
              padding: '8px 16px',
              backgroundColor: '#4f46e5',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.875rem',
            }}
          >
            Сохранить шаблон карточки
          </button>
        </div>
      </div>

      <div style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={resetToDefaults}
          style={{
            padding: '8px 16px',
            backgroundColor: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Сбросить к значениям по умолчанию
        </button>
        {saved && (
          <span style={{ marginLeft: 12, color: '#059669', fontSize: '0.875rem' }}>
            ✓ Сохранено
          </span>
        )}
      </div>
    </section>
  );
}
