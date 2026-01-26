'use client';

import React, { useEffect, useRef, useState } from 'react';

import Link from 'next/link';

import { ProductCard } from '@/pages/catalog/ui/ProductsGrid';
import * as compareApi from '@/shared/api/compare';
import { useCompare } from '@/shared/lib/hooks';

import styles from './page.module.css';

interface CompareProduct {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice?: number;
  images: string[];
  category: {
    id: string;
    name: string;
    slug: string;
  };
  isNew?: boolean;
  isFeatured?: boolean;
  stock?: number;
  attributes?: Array<{ name: string; value: string }> | Record<string, unknown> | null;
}

export default function ComparePage() {
  const { count, refreshCount, compare } = useCompare();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const loadCompare = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const compareProducts = await compareApi.getCompare();
      setProducts(compareProducts);
      await refreshCount();
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Необходима авторизация') {
          setError('Войдите в систему, чтобы просмотреть сравнение товаров');
        } else {
          setError(err.message);
        }
      } else {
        setError('Произошла ошибка при загрузке сравнения');
      }
    } finally {
      setLoading(false);
    }
  }, [refreshCount]);

  useEffect(() => {
    loadCompare();
  }, [loadCompare]);

  // Обновляем список товаров при изменении количества в сравнении
  useEffect(() => {
    if (!loading && products.length !== count) {
      loadCompare();
    }
  }, [count, loading, products.length, loadCompare]);

  // Преобразуем формат API в формат Product для ProductCard
  const mappedProducts = products.map((p, index) => {
    const price = typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price);
    const comparePrice = p.comparePrice
      ? typeof p.comparePrice === 'string'
        ? parseFloat(p.comparePrice)
        : Number(p.comparePrice)
      : undefined;

    return {
      id: index + 1, // Временный ID для ProductCard
      originalId: p.id, // Оригинальный ID из API для работы с compare
      slug: p.slug,
      name: p.name,
      price,
      oldPrice: comparePrice,
      image: p.images?.[0] || '/images/products/door-placeholder.jpg',
      images: p.images || [],
      category: p.category.name,
      categoryId: parseInt(p.category.id) || undefined,
      rating: 4.5, // Можно добавить реальный рейтинг позже
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      inStock: (p.stock ?? 0) > 0,
      discount: comparePrice
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : undefined,
      characteristics: (() => {
        if (!p.attributes) return undefined;

        // Если атрибуты - массив
        if (Array.isArray(p.attributes)) {
          return p.attributes
            .filter((attr) => attr && attr.name && attr.value !== null && attr.value !== undefined)
            .map((attr) => ({
              name: String(attr.name),
              value: String(attr.value),
            }));
        }

        // Если атрибуты - объект
        if (typeof p.attributes === 'object' && p.attributes !== null) {
          return Object.entries(p.attributes)
            .filter(([_, value]) => value !== null && value !== undefined && value !== '')
            .map(([name, value]) => ({
              name: String(name),
              value: String(value),
            }));
        }

        return undefined;
      })(),
    };
  });

  // Получаем все уникальные характеристики для сравнения
  const allCharacteristics = React.useMemo(() => {
    const charMap = new Map<string, Set<string>>();
    mappedProducts.forEach((product) => {
      if (product.characteristics && Array.isArray(product.characteristics)) {
        product.characteristics.forEach((char) => {
          // Пропускаем пустые значения и некорректные данные
          if (char && char.name && char.value) {
            if (!charMap.has(char.name)) {
              charMap.set(char.name, new Set());
            }
            charMap.get(char.name)!.add(char.value);
          }
        });
      }
    });
    return Array.from(charMap.keys()).sort(); // Сортируем для консистентности
  }, [mappedProducts]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка сравнения...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Ошибка</h1>
          <p>{error}</p>
          <Link href="/" className={styles.link}>
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>Сравнение товаров</h1>
        </div>
        <div className={styles.empty}>
          <h2>Ваш список сравнения пуст</h2>
          <p>Добавьте товары в сравнение, чтобы сравнить их характеристики</p>
          <Link href="/catalog/products" className={styles.link}>
            Перейти в каталог
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Сравнение товаров</h1>
        {count > 0 && (
          <p className={styles.subtitle}>
            {count} {count === 1 ? 'товар' : count < 5 ? 'товара' : 'товаров'} в сравнении
          </p>
        )}
      </div>

      {/* Таблица сравнения */}
      <div className={styles.compareTableWrapper}>
        <div className={styles.scrollControls}>
          <button
            type="button"
            className={styles.scrollButton}
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({ left: -300, behavior: 'smooth' });
              }
            }}
            aria-label="Прокрутить влево"
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.scrollButton}
            onClick={() => {
              if (scrollContainerRef.current) {
                scrollContainerRef.current.scrollBy({ left: 300, behavior: 'smooth' });
              }
            }}
            aria-label="Прокрутить вправо"
          >
            ›
          </button>
        </div>
        <div className={styles.compareTable} ref={scrollContainerRef}>
          <div className={styles.tableHeader}>
            <div className={styles.headerCell}>Характеристика</div>
            {mappedProducts.map((product) => (
              <div key={product.originalId || product.slug} className={styles.headerCell}>
                <ProductCard
                  product={product}
                  isCompareMode={true}
                  onRemoveFromCompare={loadCompare}
                />
              </div>
            ))}
          </div>

          {/* Основные характеристики */}
          <div className={styles.tableRow}>
            <div className={styles.rowLabel}>Название</div>
            {mappedProducts.map((product) => (
              <div key={`name-${product.originalId}`} className={styles.rowCell}>
                {product.name}
              </div>
            ))}
          </div>

          <div className={styles.tableRow}>
            <div className={styles.rowLabel}>Цена</div>
            {mappedProducts.map((product) => (
              <div key={`price-${product.originalId}`} className={styles.rowCell}>
                <div className={styles.priceContainer}>
                  {product.oldPrice && (
                    <span className={styles.oldPrice}>{product.oldPrice.toLocaleString()} ₽</span>
                  )}
                  <span className={styles.price}>{product.price.toLocaleString()} ₽</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.tableRow}>
            <div className={styles.rowLabel}>Категория</div>
            {mappedProducts.map((product) => (
              <div key={`category-${product.originalId}`} className={styles.rowCell}>
                {product.category}
              </div>
            ))}
          </div>

          <div className={styles.tableRow}>
            <div className={styles.rowLabel}>Наличие</div>
            {mappedProducts.map((product) => (
              <div key={`stock-${product.originalId}`} className={styles.rowCell}>
                {product.inStock ? (
                  <span className={styles.inStock}>✓ В наличии</span>
                ) : (
                  <span className={styles.outOfStock}>Под заказ</span>
                )}
              </div>
            ))}
          </div>

          {/* Дополнительные характеристики */}
          {allCharacteristics.length > 0 && (
            <>
              {allCharacteristics.map((charName) => (
                <div key={charName} className={styles.tableRow}>
                  <div className={styles.rowLabel}>{charName}</div>
                  {mappedProducts.map((product) => {
                    const char = product.characteristics?.find((c) => c.name === charName);
                    return (
                      <div key={`${charName}-${product.originalId}`} className={styles.rowCell}>
                        {char ? char.value : '—'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
