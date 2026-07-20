import type { PublicComponentDraftRow } from '@/shared/api/product-components';

import type { AttributeItem, ProductData } from './product-detail-page.types';

export function catalogBadgeIdsFromProduct(product: ProductData): string[] {
  return (product.cardBadgeSelections ?? [])
    .slice()
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    .map((s) => String(s.badge.id));
}

export function serializePublicAttributeDraft(rows: AttributeItem[]): string {
  return JSON.stringify(
    rows.map((a) => ({
      name: a.name.trim(),
      value: a.value,
      slug: a.slug ?? '',
    }))
  );
}

export function serializePublicComponentsDraft(rows: PublicComponentDraftRow[]): string {
  return JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      name: r.name.trim(),
      type: r.type.trim(),
      price: r.price.replace(/\s/g, '').replace(',', '.'),
    }))
  );
}

/** Путь в каталог как в app router: /catalog/products[/parent][/child]; сегменты кодируются для безопасных slug из API */
export function catalogProductsHref(...slugSegments: string[]): string {
  const parts = slugSegments
    .map((s) =>
      String(s ?? '')
        .trim()
        .replace(/^\uFEFF/, '')
    )
    .filter((s) => s.length > 0);
  if (parts.length === 0) return '/catalog/products';
  return `/catalog/products/${parts.map((p) => encodeURIComponent(p)).join('/')}`;
}

/** Прокрутка в начало страницы товара (мобильные часто сохраняют offset с каталога или смещаются после подгрузки контента). */
export function scrollProductDetailToTop() {
  if (typeof window === 'undefined') return;
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}
