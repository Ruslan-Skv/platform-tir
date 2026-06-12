import type { Product } from '@/entities/product/types';
import type { CatalogApiProduct } from '@/shared/types/catalog';

export type { CatalogApiProduct };

export function mapCatalogApiProductToProduct(p: CatalogApiProduct, index: number): Product {
  return {
    id: index + 1,
    originalId: p.id,
    slug: p.slug,
    name: p.name,
    sku: p.sku || undefined,
    description: p.description || undefined,
    price: parseFloat(p.price),
    oldPrice: p.comparePrice ? parseFloat(p.comparePrice) : undefined,
    image: p.images[0] || '/images/products/door-placeholder.jpg',
    images: p.images,
    category: p.category.name,
    categorySlug: p.category.slug,
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
    manufacturerId: p.manufacturer?.id ?? null,
    doorThicknessLabel: p.doorThickness?.name ?? null,
    weatherstripLabel: p.weatherstrip?.name ?? null,
    parentCategorySlug: p.category.parent?.slug ?? null,
    parentCategoryName: p.category.parent?.name ?? null,
    attributes: p.attributes ?? null,
    discount: p.comparePrice
      ? Math.round(
          ((parseFloat(p.comparePrice) - parseFloat(p.price)) / parseFloat(p.comparePrice)) * 100
        )
      : undefined,
    sortOrder: p.sortOrder ?? 0,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : Date.now(),
    videoUrl: p.videoUrl ?? undefined,
    cardVariants: p.cardVariants?.map((v) => ({
      id: v.id,
      name: v.name,
      price: typeof v.price === 'string' ? parseFloat(v.price) : v.price,
      image: v.image ?? undefined,
      size: v.size ?? undefined,
      color: v.color ?? undefined,
      extraOption: v.extraOption ?? undefined,
      sortOrder: v.sortOrder,
    })),
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
