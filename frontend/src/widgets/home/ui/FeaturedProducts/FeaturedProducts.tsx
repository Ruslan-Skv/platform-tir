'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Product } from '@/entities/product/types';
import { ProductCard } from '@/pages/catalog/ui/ProductsGrid';

import styles from './FeaturedProducts.module.css';

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
  images: string[];
  sortOrder?: number;
  createdAt?: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

function mapApiProductToProduct(p: ApiProduct, index: number): Product {
  const price = parseFloat(p.price);
  const comparePrice = p.comparePrice ? parseFloat(p.comparePrice) : null;
  return {
    id: index + 1,
    originalId: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku || undefined,
    description: p.description || undefined,
    price,
    oldPrice: comparePrice ?? undefined,
    image: p.images[0] || '',
    images: p.images,
    category: p.category.name,
    categoryId: parseInt(p.category.id, 10) || undefined,
    rating: 4.5,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    inStock: p.stock > 0,
    discount:
      comparePrice && comparePrice > price
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : undefined,
    sortOrder: p.sortOrder ?? 0,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
  };
}

export const FeaturedProducts: React.FC = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/products/featured?limit=8`);
        if (!response.ok) return;
        const data: { products: ApiProduct[] } = await response.json();
        const mapped = (data.products || []).map((p, i) => mapApiProductToProduct(p, i));
        setProducts(mapped);
      } catch {
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const handleViewAll = () => {
    router.push('/catalog');
  };

  return (
    <section className={styles.featured}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Популярные товары</h2>
            <p className={styles.subtitle}>Товары, которые выбирают наши клиенты</p>
          </div>
          <button type="button" className={styles.viewAllButton} onClick={handleViewAll}>
            Смотреть все →
          </button>
        </div>

        {loading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : products.length > 0 ? (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard key={product.originalId ?? product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Популярных товаров пока нет</div>
        )}
      </div>
    </section>
  );
};
