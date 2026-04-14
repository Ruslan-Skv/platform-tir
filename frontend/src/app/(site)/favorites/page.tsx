'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import * as wishlistApi from '@/shared/api/wishlist';
import { useWishlist } from '@/shared/lib/hooks';
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

export default function FavoritesPage() {
  const { count, refreshCount } = useWishlist();
  const [products, setProducts] = useState<CatalogApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchPartnerSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/home/partner-products`);
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

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setLoading(true);
        setError(null);
        const wishlistProducts = await wishlistApi.getWishlist();
        setProducts(wishlistProducts);
        await refreshCount();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('Произошла ошибка при загрузке избранного');
        }
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [refreshCount, count]);

  const mappedProducts = useMemo(
    () => products.map((p, index) => mapCatalogApiProductToProduct(p, index)),
    [products]
  );

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка избранного...</div>
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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>Избранное</h1>
          {count > 0 && (
            <span className={styles.itemCount}>
              {count} {goodsWord(count)}
            </span>
          )}
        </div>
      </div>

      {products.length === 0 ? (
        <div className={styles.empty}>
          <h2>Ваш список избранного пуст</h2>
          <p>Добавьте товары в избранное, чтобы вернуться к ним позже</p>
          <Link href="/catalog/products" className={styles.link}>
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div
          className={`${styles.productsGrid} ${catalogGridStyles.grid} ${catalogGridStyles.gridMobile2}`}
        >
          {mappedProducts.map((product) => (
            <ProductCard
              key={product.originalId ?? product.slug}
              product={product}
              partnerLogoUrl={partnerSettings.partnerLogoUrl}
              showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
            />
          ))}
        </div>
      )}
    </div>
  );
}
