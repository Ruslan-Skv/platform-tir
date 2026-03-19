'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import * as compareApi from '@/shared/api/compare';
import { useCompare } from '@/shared/lib/hooks';
import { ProductCard } from '@/views/catalog/ui/ProductsGrid';

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

const SLOTS_MOBILE = 2;
const SLOTS_DESKTOP = 4;

export default function ComparePage() {
  const { count, refreshCount, compare } = useCompare();
  const [products, setProducts] = useState<CompareProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const slotScrollRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleSlotScroll = useCallback((slot: number, listLength: number) => {
    const el = slotScrollRefs.current[slot];
    if (!el || listLength <= 1) return;
    const pageWidth = el.clientWidth;
    const idx = Math.round(el.scrollLeft / pageWidth);
    const clamped = Math.max(0, Math.min(idx, listLength - 1));
    setSelectedIndices((prev) => {
      if (prev[slot] === clamped) return prev;
      const next = [...prev];
      next[slot] = clamped;
      return next;
    });
  }, []);

  const slotCount = isMobile ? SLOTS_MOBILE : SLOTS_DESKTOP;

  // Каждый слот привязан к одному товару: слот i = products[i]. Лишние слоты пустые.
  const productsPerSlot = useMemo(
    () =>
      Array(slotCount)
        .fill(null)
        .map((_, slot) => (slot < products.length ? [products[slot]!] : [])),
    [products, slotCount]
  );

  // Индекс выбранного продукта внутри каждого слота (для мобильной прокрутки, когда товаров > слотов)
  const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    // Каждый слот показывает товар с тем же индексом (0, 1, 2, 3...). Пустые слоты — 0.
    setSelectedIndices(Array.from({ length: slotCount }, () => 0));
  }, [products.length, slotCount]);

  const loadCompare = useCallback(async () => {
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

  useEffect(() => {
    if (!loading && products.length !== count) {
      loadCompare();
    }
  }, [count, loading, products.length, loadCompare]);

  const mappedProducts = useMemo(
    () =>
      products.map((p, index) => {
        const price = typeof p.price === 'string' ? parseFloat(p.price) : Number(p.price);
        const comparePrice = p.comparePrice
          ? typeof p.comparePrice === 'string'
            ? parseFloat(p.comparePrice)
            : Number(p.comparePrice)
          : undefined;

        return {
          id: index + 1,
          originalId: p.id,
          slug: p.slug,
          name: p.name,
          price,
          oldPrice: comparePrice,
          image: p.images?.[0] || '/images/products/door-placeholder.jpg',
          images: p.images || [],
          category: p.category.name,
          categoryId: parseInt(p.category.id) || undefined,
          rating: 4.5,
          isNew: p.isNew,
          isFeatured: p.isFeatured,
          inStock: (p.stock ?? 0) > 0,
          discount: comparePrice
            ? Math.round(((comparePrice - price) / comparePrice) * 100)
            : undefined,
          characteristics: (() => {
            if (!p.attributes) return undefined;
            if (Array.isArray(p.attributes)) {
              return p.attributes
                .filter((attr) => attr && attr.name && attr.value != null)
                .map((attr) => ({ name: String(attr.name), value: String(attr.value) }));
            }
            if (typeof p.attributes === 'object' && p.attributes !== null) {
              return Object.entries(p.attributes)
                .filter(([_, v]) => v != null && v !== '')
                .map(([name, value]) => ({ name: String(name), value: String(value) }));
            }
            return undefined;
          })(),
        };
      }),
    [products]
  );

  const allCharacteristics = useMemo(() => {
    const charMap = new Map<string, Set<string>>();
    mappedProducts.forEach((product) => {
      product.characteristics?.forEach((char) => {
        if (char?.name && char?.value) {
          if (!charMap.has(char.name)) charMap.set(char.name, new Set());
          charMap.get(char.name)!.add(char.value);
        }
      });
    });
    return Array.from(charMap.keys()).sort();
  }, [mappedProducts]);

  const setSlotIndex = useCallback((slot: number, delta: number, listLength: number) => {
    if (listLength <= 1) return;
    setSelectedIndices((prev) => {
      const next = [...prev];
      next[slot] = (next[slot] + delta + listLength) % listLength;
      return next;
    });
  }, []);

  const getMappedProductForSlot = (slot: number) => {
    const list = productsPerSlot[slot];
    const idx = selectedIndices[slot] ?? 0;
    const p = list?.[idx] ?? null;
    if (!p) return null;
    const productIdx = products.indexOf(p);
    return mappedProducts[productIdx] ?? null;
  };

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

  type MappedProduct = (typeof mappedProducts)[0] | null;
  const basicRows = [
    { key: 'name', label: 'Название', get: (m: MappedProduct) => m?.name ?? '—' },
    {
      key: 'price',
      label: 'Цена',
      get: (m: MappedProduct) =>
        m ? (
          <div className={styles.priceContainer}>
            {m.oldPrice && <span className={styles.oldPrice}>{m.oldPrice.toLocaleString()} ₽</span>}
            <span className={styles.price}>{m.price.toLocaleString()} ₽</span>
          </div>
        ) : (
          '—'
        ),
    },
    { key: 'category', label: 'Категория', get: (m: MappedProduct) => m?.category ?? '—' },
    {
      key: 'stock',
      label: 'Наличие',
      get: (m: MappedProduct) =>
        m ? (
          m.inStock ? (
            <span className={styles.inStock}>✓ В наличии</span>
          ) : (
            <span className={styles.outOfStock}>Под заказ</span>
          )
        ) : (
          '—'
        ),
    },
  ] as const;

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

      <div className={styles.compareWrapper}>
        {/* Десктоп: таблица с фиксированной колонкой характеристик */}
        {!isMobile && (
          <div className={styles.compareTableWrapper}>
            <div className={styles.compareTable}>
              <div className={styles.tableHeader}>
                <div className={styles.headerCellChars} />
                {Array.from({ length: slotCount }).map((_, slot) => {
                  const product = getMappedProductForSlot(slot);
                  const slotProducts = productsPerSlot[slot] ?? [];
                  const canScroll = slotProducts.length > 1;
                  return (
                    <div key={slot} className={styles.slotColumn}>
                      <div className={styles.slotCard}>
                        {product && (
                          <ProductCard
                            product={product}
                            isCompareMode
                            onRemoveFromCompare={loadCompare}
                          />
                        )}
                      </div>
                      {canScroll && (
                        <div className={styles.slotNav}>
                          <button
                            type="button"
                            onClick={() => setSlotIndex(slot, -1, slotProducts.length)}
                            aria-label="Предыдущий товар"
                          >
                            ‹
                          </button>
                          <span>
                            {selectedIndices[slot]! + 1} / {slotProducts.length}
                          </span>
                          <button
                            type="button"
                            onClick={() => setSlotIndex(slot, 1, slotProducts.length)}
                            aria-label="Следующий товар"
                          >
                            ›
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {basicRows.map((row) => (
                <div key={row.key} className={styles.tableRow}>
                  <div className={styles.rowLabel}>{row.label}</div>
                  {Array.from({ length: slotCount }).map((_, slot) => (
                    <div key={slot} className={styles.rowCell}>
                      {row.get(getMappedProductForSlot(slot))}
                    </div>
                  ))}
                </div>
              ))}

              {allCharacteristics.map((charName) => (
                <div key={charName} className={styles.tableRow}>
                  <div className={styles.rowLabel}>{charName}</div>
                  {Array.from({ length: slotCount }).map((_, slot) => {
                    const m = getMappedProductForSlot(slot);
                    const char = m?.characteristics?.find((c) => c.name === charName);
                    return (
                      <div key={slot} className={styles.rowCell}>
                        {char ? char.value : '—'}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Мобильный: карточки с параметрами под каждым товаром (как vseinstrumenti) */}
        {isMobile && (
          <div className={styles.mobileCompare}>
            {Array.from({ length: slotCount }).map((_, slot) => {
              const slotProducts = productsPerSlot[slot] ?? [];
              const canScroll = slotProducts.length > 1;
              return (
                <div key={slot} className={styles.mobileSlot}>
                  <div
                    className={styles.mobileSlotScroll}
                    ref={(el) => {
                      slotScrollRefs.current[slot] = el;
                    }}
                    onScroll={() => handleSlotScroll(slot, slotProducts.length)}
                  >
                    {slotProducts.map((p) => {
                      const productIdx = products.indexOf(p);
                      const mp = mappedProducts[productIdx];
                      return (
                        <div key={p.id} className={styles.mobileSlotPage}>
                          <div className={styles.mobileCard}>
                            {mp && (
                              <ProductCard
                                product={mp}
                                isCompareMode
                                compact
                                onRemoveFromCompare={loadCompare}
                              />
                            )}
                          </div>
                          <div className={styles.mobileParams}>
                            {basicRows.map((row) => (
                              <div key={row.key} className={styles.mobileParam}>
                                <span className={styles.mobileParamName}>{row.label}</span>
                                <div className={styles.mobileParamValue}>{row.get(mp ?? null)}</div>
                              </div>
                            ))}
                            {allCharacteristics.map((charName) => {
                              const char = mp?.characteristics?.find((c) => c.name === charName);
                              return (
                                <div key={charName} className={styles.mobileParam}>
                                  <span className={styles.mobileParamName}>{charName}</span>
                                  <span className={styles.mobileParamValue}>
                                    {char ? char.value : '—'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {canScroll && (
                    <div className={styles.mobileSlotNav}>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx =
                            (selectedIndices[slot]! - 1 + slotProducts.length) %
                            slotProducts.length;
                          setSlotIndex(slot, -1, slotProducts.length);
                          const el = slotScrollRefs.current[slot];
                          if (el) {
                            el.scrollTo({
                              left: nextIdx * el.clientWidth,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        aria-label="Предыдущий товар"
                      >
                        ‹
                      </button>
                      <span>
                        {selectedIndices[slot]! + 1} / {slotProducts.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const nextIdx = (selectedIndices[slot]! + 1) % slotProducts.length;
                          setSlotIndex(slot, 1, slotProducts.length);
                          const el = slotScrollRefs.current[slot];
                          if (el) {
                            el.scrollTo({
                              left: nextIdx * el.clientWidth,
                              behavior: 'smooth',
                            });
                          }
                        }}
                        aria-label="Следующий товар"
                      >
                        ›
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
