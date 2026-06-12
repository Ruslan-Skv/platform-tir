import type { CatalogApiProduct } from '@/shared/types/catalog';
import { buildCatalogItemListJsonLd } from '@/views/catalog/lib/catalog-seo';

export function CatalogItemListJsonLd({
  products,
  listUrl,
}: {
  products: CatalogApiProduct[];
  listUrl: string;
}) {
  if (products.length === 0) return null;
  const schema = buildCatalogItemListJsonLd(products, listUrl);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
