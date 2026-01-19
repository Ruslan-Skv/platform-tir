'use client';

import React, { useEffect, useState } from 'react';

import type { Product } from '@/entities/product/types';

import { ProductCard } from './ProductCard';
import styles from './ProductsGrid.module.css';

interface ApiProduct {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sku: string | null;
  price: string;
  comparePrice: string | null;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
  images: string[];
  attributes: Record<string, unknown> | null;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface CategoryResponse {
  category: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
  };
  products: ApiProduct[];
  total: number;
}

interface ProductsGridProps {
  categorySlug?: string;
  categoryName?: string;
  currentPage?: number;
  onTotalPagesChange?: (totalPages: number) => void;
}

const PRODUCTS_PER_PAGE = 20; // 5 строк × 4 столбца

export const ProductsGrid: React.FC<ProductsGridProps> = ({
  categorySlug,
  categoryName = 'Каталог',
  currentPage = 1,
  onTotalPagesChange,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categorySlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
        // Для slug "all" используем специальный endpoint для всех товаров
        const endpoint =
          categorySlug === 'all'
            ? `${apiUrl}/products/catalog/all`
            : `${apiUrl}/products/category/${categorySlug}`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Не удалось загрузить товары');
        }

        const data: CategoryResponse = await response.json();

        // Преобразуем API-формат в формат Product для компонента
        const mappedProducts: Product[] = data.products.map((p, index) => ({
          id: index + 1,
          slug: p.slug,
          name: p.name,
          description: p.description || undefined,
          price: parseFloat(p.price),
          oldPrice: p.comparePrice ? parseFloat(p.comparePrice) : undefined,
          image: p.images[0] || '/images/products/door-placeholder.jpg',
          images: p.images,
          category: p.category.name,
          categoryId: parseInt(p.category.id) || undefined,
          rating: 4.5, // Пока захардкожено, позже можно добавить reviews
          isNew: p.isFeatured,
          inStock: p.stock > 0,
          discount: p.comparePrice
            ? Math.round(
                ((parseFloat(p.comparePrice) - parseFloat(p.price)) / parseFloat(p.comparePrice)) *
                  100
              )
            : undefined,
        }));

        setProducts(mappedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [categorySlug]);

  // Пагинация - вычисляем до условных возвратов
  const totalPages = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const startIndex = (currentPage - 1) * PRODUCTS_PER_PAGE;
  const endIndex = startIndex + PRODUCTS_PER_PAGE;
  const currentProducts = products.slice(startIndex, endIndex);

  // Передаём количество страниц в родительский компонент
  // Этот useEffect должен быть до условных return, чтобы соблюдать правила хуков
  useEffect(() => {
    onTotalPagesChange?.(totalPages);
  }, [totalPages, onTotalPagesChange]);

  if (loading) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>
          <h1 className={styles.title}>{categoryName}</h1>
        </div>
        <div className={styles.loading}>Загрузка товаров...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>
          <h1 className={styles.title}>{categoryName}</h1>
        </div>
        <div className={styles.error}>{error}</div>
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className={styles.productsGrid}>
        <div className={styles.gridHeader}>
          <h1 className={styles.title}>{categoryName}</h1>
        </div>
        <div className={styles.empty}>Товары не найдены</div>
      </div>
    );
  }

  return (
    <div className={styles.productsGrid}>
      <div className={styles.gridHeader}>
        <h1 className={styles.title}>{categoryName}</h1>
        <div className={styles.headerRight}>
          <span className={styles.totalCount}>
            {products.length}{' '}
            {products.length === 1 ? 'товар' : products.length < 5 ? 'товара' : 'товаров'}
          </span>
          <div className={styles.sorting}>
            <select className={styles.sortSelect}>
              <option value="popular">По популярности</option>
              <option value="price-asc">По цене (сначала дешевые)</option>
              <option value="price-desc">По цене (сначала дорогие)</option>
              <option value="new">По новизне</option>
              <option value="rating">По рейтингу</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {currentProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
};
