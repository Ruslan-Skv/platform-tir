'use client';

import React, { useMemo } from 'react';

import { useRouter } from 'next/navigation';

import type { Product } from '@/entities/product/types';
import { ProductCard } from '@/features/catalog';
import type { FeaturedApiProduct, FeaturedProductsBlockSettings } from '@/shared/api/home';
import {
  useFeaturedProducts,
  useFeaturedProductsBlock,
  usePartnerProductsCardSettings,
} from '@/shared/lib/hooks/useHomePageData';

import styles from './FeaturedProducts.module.css';

const defaultBlock: FeaturedProductsBlockSettings = {
  title: 'Популярные товары',
  subtitle: 'Товары, которые выбирают наши клиенты',
  limit: 8,
  primaryFilter: 'featured',
  secondaryOrder: 'sort_order',
};

function mapApiProductToProduct(p: FeaturedApiProduct, index: number): Product {
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
    stock: p.stock,
    onOrder: p.onOrder ?? false,
    discount:
      comparePrice && comparePrice > price
        ? Math.round(((comparePrice - price) / comparePrice) * 100)
        : undefined,
    sortOrder: p.sortOrder ?? 0,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
    videoUrl: p.videoUrl ?? undefined,
    catalogBadges: (p.cardBadgeSelections ?? [])
      .slice()
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((s) => s.badge)
      .filter((b) => b.imageUrl != null && b.imageUrl !== '')
      .map((b) => ({
        id: b.id,
        key: b.key,
        label: b.label,
        imageUrl: b.imageUrl as string,
        description: b.description ?? null,
      })),
  };
}

export const FeaturedProducts: React.FC = () => {
  const router = useRouter();
  const { data: blockResponse } = useFeaturedProductsBlock();
  const { data: partnerSettings } = usePartnerProductsCardSettings();

  const block = useMemo(
    () => ({
      ...defaultBlock,
      ...blockResponse,
      primaryFilter: blockResponse?.primaryFilter ?? defaultBlock.primaryFilter,
      secondaryOrder: blockResponse?.secondaryOrder ?? defaultBlock.secondaryOrder,
    }),
    [blockResponse]
  );

  const productsParams = useMemo(
    () => ({
      limit: block.limit,
      primaryFilter: block.primaryFilter,
      secondaryOrder: block.secondaryOrder,
    }),
    [block.limit, block.primaryFilter, block.secondaryOrder]
  );

  const { data: apiProducts = [], isLoading } = useFeaturedProducts(productsParams);

  const products = useMemo(
    () => apiProducts.map((product, index) => mapApiProductToProduct(product, index)),
    [apiProducts]
  );

  const showLoading = isLoading && products.length === 0;
  const resolvedPartnerSettings = partnerSettings ?? {
    partnerLogoUrl: null,
    showPartnerIconOnCards: true,
  };

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

        {showLoading ? (
          <div className={styles.loading}>Загрузка...</div>
        ) : products.length > 0 ? (
          <div className={styles.productsGrid}>
            {products.map((product) => (
              <ProductCard
                key={product.originalId ?? product.id}
                product={product}
                partnerLogoUrl={resolvedPartnerSettings.partnerLogoUrl}
                showPartnerIconOnCards={resolvedPartnerSettings.showPartnerIconOnCards}
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
