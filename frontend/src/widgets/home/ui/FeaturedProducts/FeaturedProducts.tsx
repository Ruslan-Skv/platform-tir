'use client';

import React, { useEffect, useState } from 'react';

import { useRouter } from 'next/navigation';

import type { Product } from '@/entities/product/types';
import { ProductCard } from '@/pages/catalog/ui/ProductsGrid';

import styles from './FeaturedProducts.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface BlockSettings {
  title: string;
  subtitle: string;
  limit: number;
  primaryFilter: 'featured' | 'new' | 'featured_or_new' | 'any';
  secondaryOrder: 'sort_order' | 'created_desc';
}

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
  sortOrder?: number;
  createdAt?: string;
  rating?: number;
  reviewsCount?: number;
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
    rating: p.rating ?? 0,
    reviewsCount: p.reviewsCount ?? 0,
    isNew: p.isNew,
    isFeatured: p.isFeatured,
    isPartnerProduct: p.isPartnerProduct ?? !!p.partner,
    partnerLogoUrl: p.partner?.logoUrl ?? null,
    partnerShowLogoOnCards: p.partner?.showLogoOnCards ?? true,
    partnerName: p.partner?.name ?? null,
    partnerTooltipText: p.partner?.tooltipText ?? null,
    partnerShowTooltip: p.partner?.showTooltip ?? true,
    inStock: p.stock > 0,
    discount:
      comparePrice && comparePrice > price
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : undefined,
    sortOrder: p.sortOrder ?? 0,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
  };
}

const defaultBlock: BlockSettings = {
  title: 'Популярные товары',
  subtitle: 'Товары, которые выбирают наши клиенты',
  limit: 8,
  primaryFilter: 'featured',
  secondaryOrder: 'sort_order',
};

export const FeaturedProducts: React.FC = () => {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [block, setBlock] = useState<BlockSettings>(defaultBlock);
  const [loading, setLoading] = useState(true);
  const [partnerSettings, setPartnerSettings] = useState<{
    partnerLogoUrl: string | null;
    showPartnerIconOnCards: boolean;
  }>({ partnerLogoUrl: null, showPartnerIconOnCards: true });

  useEffect(() => {
    const fetchBlock = async () => {
      try {
        const res = await fetch(`${API_URL}/home/featured-products`);
        if (res.ok) {
          const data = await res.json();
          setBlock({
            ...defaultBlock,
            ...data,
            primaryFilter: data.primaryFilter ?? 'featured',
            secondaryOrder: data.secondaryOrder ?? 'sort_order',
          });
        }
      } catch {
        // используем defaultBlock
      }
    };
    fetchBlock();
  }, []);

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
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          limit: String(block.limit),
          primaryFilter: block.primaryFilter,
          secondaryOrder: block.secondaryOrder,
        });
        const response = await fetch(`${API_URL}/products/featured?${params}`);
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
  }, [block.limit, block.primaryFilter, block.secondaryOrder]);

  const handleViewAll = () => {
    router.push('/catalog');
  };

  return (
    <section className={styles.featured}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{block.title}</h2>
            <p className={styles.subtitle}>{block.subtitle}</p>
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
              <ProductCard
                key={product.originalId ?? product.id}
                product={product}
                partnerLogoUrl={partnerSettings.partnerLogoUrl}
                showPartnerIconOnCards={partnerSettings.showPartnerIconOnCards}
              />
            ))}
          </div>
        ) : (
          <div className={styles.empty}>Популярных товаров пока нет</div>
        )}
      </div>
    </section>
  );
};
