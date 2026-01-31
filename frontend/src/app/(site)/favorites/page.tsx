'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import { ProductCard } from '@/pages/catalog/ui/ProductsGrid';
import * as wishlistApi from '@/shared/api/wishlist';
import { useWishlist } from '@/shared/lib/hooks';

import styles from './page.module.css';

interface WishlistProduct {
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
  rating?: number;
  reviewsCount?: number;
}

export default function FavoritesPage() {
  const { count, refreshCount } = useWishlist();
  const [products, setProducts] = useState<WishlistProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
          if (err.message === 'Необходима авторизация') {
            setError('Войдите в систему, чтобы просмотреть избранные товары');
          } else {
            setError(err.message);
          }
        } else {
          setError('Произошла ошибка при загрузке избранного');
        }
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [refreshCount]);

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
      originalId: p.id, // Оригинальный ID из API для работы с wishlist
      slug: p.slug,
      name: p.name,
      price,
      oldPrice: comparePrice,
      image: p.images?.[0] || '/images/products/door-placeholder.jpg',
      images: p.images || [],
      category: p.category.name,
      categoryId: parseInt(p.category.id) || undefined,
      rating: p.rating ?? 0,
      reviewsCount: p.reviewsCount ?? 0,
      isNew: p.isNew,
      isFeatured: p.isFeatured,
      inStock: (p.stock ?? 0) > 0,
      discount: comparePrice
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : undefined,
    };
  });

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
        <h1 className={styles.title}>Избранное</h1>
        {count > 0 && (
          <p className={styles.subtitle}>
            {count} {count === 1 ? 'товар' : count < 5 ? 'товара' : 'товаров'} в избранном
          </p>
        )}
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
        <div className={styles.grid}>
          {mappedProducts.map((product) => (
            <ProductCard key={product.originalId || product.slug} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
