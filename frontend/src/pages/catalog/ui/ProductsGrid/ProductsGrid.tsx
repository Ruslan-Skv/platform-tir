'use client';

import React, { useEffect, useState } from 'react';

import type { Product } from '@/entities/product/types';

import { ProductCard } from './ProductCard';
import styles from './ProductsGrid.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

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
  isNew: boolean;
  isFeatured: boolean;
  isPartnerProduct?: boolean;
  images: string[];
  attributes: Record<string, unknown> | null;
  sortOrder?: number;
  createdAt?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
  partner?: {
    id: string;
    name: string;
    logoUrl: string | null;
    showLogoOnCards?: boolean;
    tooltipText?: string | null;
    showTooltip?: boolean;
  } | null;
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
  onSortChange?: () => void;
}

const PRODUCTS_PER_PAGE = 20; // 5 строк × 4 столбца

type SortOption =
  | 'default'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc'
  | 'name-desc'
  | 'new'
  | 'rating';

export const ProductsGrid: React.FC<ProductsGridProps> = ({
  categorySlug,
  categoryName = 'Каталог',
  currentPage = 1,
  onTotalPagesChange,
  onSortChange,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [originalProducts, setOriginalProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('default');
  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchProducts = async () => {
      if (!categorySlug) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // Для slug "all" используем специальный endpoint для всех товаров
        const endpoint =
          categorySlug === 'all'
            ? `${API_URL}/products/catalog/all`
            : `${API_URL}/products/category/${categorySlug}`;
        const response = await fetch(endpoint);

        if (!response.ok) {
          throw new Error('Не удалось загрузить товары');
        }

        const data: CategoryResponse = await response.json();

        // Преобразуем API-формат в формат Product для компонента
        const mappedProducts: Product[] = data.products.map((p, index) => ({
          id: index + 1,
          originalId: p.id, // Сохраняем оригинальный ID из API для работы с wishlist
          slug: p.slug,
          name: p.name,
          sku: p.sku || undefined,
          description: p.description || undefined,
          price: parseFloat(p.price),
          oldPrice: p.comparePrice ? parseFloat(p.comparePrice) : undefined,
          image: p.images[0] || '/images/products/door-placeholder.jpg',
          images: p.images,
          category: p.category.name,
          categoryId: parseInt(p.category.id) || undefined,
          rating: 4.5, // Пока захардкожено, позже можно добавить reviews
          isNew: p.isNew,
          isFeatured: p.isFeatured,
          isPartnerProduct: p.isPartnerProduct ?? !!p.partner,
          partnerLogoUrl: p.partner?.logoUrl ?? null,
          partnerShowLogoOnCards: p.partner?.showLogoOnCards ?? true,
          partnerName: p.partner?.name ?? null,
          partnerTooltipText: p.partner?.tooltipText ?? null,
          partnerShowTooltip: p.partner?.showTooltip ?? true,
          inStock: p.stock > 0,
          discount: p.comparePrice
            ? Math.round(
                ((parseFloat(p.comparePrice) - parseFloat(p.price)) / parseFloat(p.comparePrice)) *
                  100
              )
            : undefined,
          // Сохраняем дополнительные данные для сортировки
          sortOrder: p.sortOrder ?? 0,
          createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
        }));

        setOriginalProducts(mappedProducts);
        setProducts(mappedProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
    // Сбрасываем сортировку при изменении категории
    setSortBy('default');
  }, [categorySlug]);

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

  // Функция сортировки товаров
  const sortProducts = (productsToSort: Product[], sortOption: SortOption): Product[] => {
    const sorted = [...productsToSort];

    switch (sortOption) {
      case 'price-asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price-desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'name-asc':
        return sorted.sort((a, b) => a.name.localeCompare(b.name, 'ru'));
      case 'name-desc':
        return sorted.sort((a, b) => b.name.localeCompare(a.name, 'ru'));
      case 'new':
        return sorted.sort((a, b) => {
          // Сначала новые товары (isNew), затем по дате создания
          if (a.isNew !== b.isNew) {
            return a.isNew ? -1 : 1;
          }
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
      case 'rating':
        return sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      case 'default':
      default:
        // Сортировка по sortOrder (из админки), затем по дате создания
        return sorted.sort((a, b) => {
          const sortOrderA = a.sortOrder ?? 0;
          const sortOrderB = b.sortOrder ?? 0;
          if (sortOrderA !== sortOrderB) {
            return sortOrderA - sortOrderB;
          }
          return (b.createdAt || 0) - (a.createdAt || 0);
        });
    }
  };

  // Применяем сортировку при изменении sortBy или originalProducts
  useEffect(() => {
    const sorted = sortProducts(originalProducts, sortBy);
    setProducts(sorted);
  }, [sortBy, originalProducts]);

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
            <label htmlFor="sort-select" className={styles.sortLabel}>
              Сортировка:
            </label>
            <select
              id="sort-select"
              className={styles.sortSelect}
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as SortOption);
                // Сбрасываем на первую страницу при изменении сортировки
                onSortChange?.();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <option value="default">По умолчанию</option>
              <option value="price-asc">По цене (сначала дешевые)</option>
              <option value="price-desc">По цене (сначала дорогие)</option>
              <option value="name-asc">По названию (А-Я)</option>
              <option value="name-desc">По названию (Я-А)</option>
              <option value="new">По новизне</option>
              <option value="rating">По рейтингу</option>
            </select>
          </div>
        </div>
      </div>

      <div className={styles.grid}>
        {currentProducts.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            partnerLogoUrl={partnerSettings.partnerLogoUrl}
            showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
          />
        ))}
      </div>
    </div>
  );
};
