'use client';

import React, { Fragment, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import type { ProductCharacteristic } from '@/entities/product';
import * as compareApi from '@/shared/api/compare';
import { apiFetch } from '@/shared/lib/api-fetch';
import { useCompare } from '@/shared/lib/hooks';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import type { CatalogApiProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';
import { mapCatalogApiProductToProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';
import { ProductCard } from '@/views/catalog/ui/ProductsGrid';
import catalogGridStyles from '@/views/catalog/ui/ProductsGrid/ProductsGrid.module.css';

import styles from './page.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

function goodsWord(n: number): string {
  const mod100 = Math.abs(n) % 100;
  const mod10 = mod100 % 10;
  if (mod100 >= 11 && mod100 <= 14) {
    return 'товаров';
  }
  if (mod10 === 1) {
    return 'товар';
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return 'товара';
  }
  return 'товаров';
}

function extractCharacteristicsFromAttributes(
  attributes:
    | CatalogApiProduct['attributes']
    | Array<{ name: string; value: string }>
    | null
    | undefined
): ProductCharacteristic[] | undefined {
  if (!attributes) return undefined;
  if (Array.isArray(attributes)) {
    return attributes
      .filter((attr) => attr && attr.name && attr.value != null)
      .map((attr) => ({ name: String(attr.name), value: String(attr.value) }));
  }
  if (typeof attributes === 'object') {
    return Object.entries(attributes)
      .filter(([_, v]) => v != null && v !== '')
      .map(([name, value]) => ({ name: String(name), value: String(value) }));
  }
  return undefined;
}

const SLOTS_MOBILE = 2;
const SLOTS_DESKTOP = 4;

export default function ComparePage() {
  const { count, refreshCount } = useCompare();
  const [products, setProducts] = useState<CatalogApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  /** id товара в каждом слоте (устойчиво к удалению других позиций из списка). */
  const [slotProductId, setSlotProductId] = useState<string[]>([]);
  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  const slotCount = isMobile ? SLOTS_MOBILE : SLOTS_DESKTOP;

  const productIdsKey = useMemo(() => products.map((p) => p.id).join('|'), [products]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    const handler = () => setIsMobile(mq.matches);
    handler();
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (products.length === 0) {
      setSlotProductId([]);
      return;
    }
    setSlotProductId((prev) =>
      Array.from({ length: slotCount }, (_, slot) => {
        const oldId = prev[slot];
        if (oldId && products.some((p) => p.id === oldId)) {
          return oldId;
        }
        return products[slot % products.length]!.id;
      })
    );
  }, [productIdsKey, products, slotCount]);

  const loadCompare = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const compareProducts = await compareApi.getCompare();
      setProducts(compareProducts);
      await refreshCount();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
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

  useEffect(() => {
    const fetchPartnerSettings = async () => {
      try {
        const res = await apiFetch(`${API_URL}/home/partner-products`);
        if (res.ok) {
          const data = await res.json();
          setPartnerSettings({
            partnerLogoUrl: data.partnerLogoUrl ?? null,
            showPartnerIconOnCards: data.showPartnerIconOnCards ?? true,
          });
        }
      } catch {
        // ignore
      }
    };
    fetchPartnerSettings();
  }, []);

  const mappedProducts = useMemo(
    () =>
      products.map((p, index) => ({
        ...mapCatalogApiProductToProduct(p, index),
        characteristics: extractCharacteristicsFromAttributes(p.attributes),
      })),
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

  const getProductIndexForSlot = (slot: number): number => {
    const id = slotProductId[slot];
    if (id) {
      const idx = products.findIndex((p) => p.id === id);
      if (idx >= 0) return idx;
    }
    return Math.min(slot, Math.max(0, products.length - 1));
  };

  const getMappedProductForSlot = (slot: number) => {
    const pi = getProductIndexForSlot(slot);
    return mappedProducts[pi] ?? null;
  };

  const shiftSlotProduct = (slot: number, delta: number) => {
    if (products.length <= 1) return;
    setSlotProductId((prev) => {
      const next = [...prev];
      const curId = next[slot];
      let curIdx = curId ? products.findIndex((p) => p.id === curId) : -1;
      if (curIdx < 0) {
        curIdx = slot % products.length;
      }
      const newIdx = (curIdx + delta + products.length) % products.length;
      next[slot] = products[newIdx]!.id;
      return next;
    });
  };

  const canPickInSlot = products.length > 1;

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
          <div className={styles.titleRow}>
            <h1 className={styles.title}>Сравнение товаров</h1>
          </div>
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
        m
          ? (() => {
              const av = getProductAvailability(Number(m.stock ?? 0), m.onOrder);
              const cls =
                av === 'in_stock'
                  ? styles.inStock
                  : av === 'on_order'
                    ? styles.onOrder
                    : styles.soldOut;
              const prefix = av === 'in_stock' ? '✓ ' : '';
              return (
                <span className={cls}>
                  {prefix}
                  {PRODUCT_AVAILABILITY_LABEL[av]}
                </span>
              );
            })()
          : '—',
    },
  ] as const;

  const renderSlotNav = (slot: number) => {
    if (!canPickInSlot) return null;
    const pi = getProductIndexForSlot(slot);
    return (
      <div className={styles.slotNav}>
        <button
          type="button"
          onClick={() => shiftSlotProduct(slot, -1)}
          aria-label={`Предыдущий товар в колонке ${slot + 1}`}
        >
          ‹
        </button>
        <span>
          {pi + 1} / {products.length}
        </span>
        <button
          type="button"
          onClick={() => shiftSlotProduct(slot, 1)}
          aria-label={`Следующий товар в колонке ${slot + 1}`}
        >
          ›
        </button>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Сравнение товаров</h1>
          {count > 0 && (
            <span className={styles.itemCount}>
              {count} {goodsWord(count)}
            </span>
          )}
        </div>
      </div>

      <div className={styles.compareWrapper}>
        {!isMobile && (
          <div className={styles.compareTableWrapper}>
            <div className={styles.compareTable}>
              <div className={styles.tableHeader}>
                <div className={styles.headerCellChars} />
                {Array.from({ length: slotCount }).map((_, slot) => {
                  const product = getMappedProductForSlot(slot);
                  return (
                    <div key={slot} className={styles.slotColumn}>
                      <div className={styles.slotCard}>
                        {product && (
                          <ProductCard
                            product={product}
                            isCompareMode
                            onRemoveFromCompare={loadCompare}
                            partnerLogoUrl={partnerSettings.partnerLogoUrl}
                            showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
                          />
                        )}
                      </div>
                      {renderSlotNav(slot)}
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

        {isMobile && (
          <div className={styles.mobileCompare}>
            <div className={`${catalogGridStyles.grid} ${catalogGridStyles.gridMobile2}`}>
              {Array.from({ length: slotCount }).map((_, slot) => {
                const mp = getMappedProductForSlot(slot);
                return (
                  <div key={slot} className={styles.mobileCardCell}>
                    {mp ? (
                      <ProductCard
                        product={mp}
                        isCompareMode
                        onRemoveFromCompare={loadCompare}
                        partnerLogoUrl={partnerSettings.partnerLogoUrl}
                        showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div
              className={styles.mobileNavRow}
              style={{ gridTemplateColumns: `repeat(${slotCount}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: slotCount }).map((_, slot) => (
                <div key={slot} className={styles.mobileNavCell}>
                  {renderSlotNav(slot)}
                </div>
              ))}
            </div>
            <div
              className={styles.mobileParamsTable}
              style={{
                gridTemplateColumns: `minmax(5.5rem, 34%) repeat(${slotCount}, minmax(0, 1fr))`,
              }}
            >
              {basicRows.map((row) => (
                <Fragment key={row.key}>
                  <div className={styles.mobileParamRowLabel}>{row.label}</div>
                  {Array.from({ length: slotCount }).map((_, slot) => (
                    <div
                      key={slot}
                      className={`${styles.mobileParamRowValue}${slot === slotCount - 1 ? ` ${styles.mobileParamRowValueLast}` : ''}`}
                    >
                      {row.get(getMappedProductForSlot(slot) ?? null)}
                    </div>
                  ))}
                </Fragment>
              ))}
              {allCharacteristics.map((charName) => (
                <Fragment key={charName}>
                  <div className={styles.mobileParamRowLabel}>{charName}</div>
                  {Array.from({ length: slotCount }).map((_, slot) => {
                    const m = getMappedProductForSlot(slot);
                    const char = m?.characteristics?.find((c) => c.name === charName);
                    return (
                      <div
                        key={slot}
                        className={`${styles.mobileParamRowValue}${slot === slotCount - 1 ? ` ${styles.mobileParamRowValueLast}` : ''}`}
                      >
                        {char ? char.value : '—'}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
