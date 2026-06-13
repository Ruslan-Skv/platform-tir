import type { CategoryAttributeForCopy, ProductForCopy } from '@/entities/product';
import { apiFetch } from '@/shared/lib/api-fetch';
import {
  type CopiedProductData,
  ProductCreatePage,
  mapProductToCopyData,
} from '@/views/admin/Catalog/Products';

const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3001';
const API_URL = `${apiBase.replace(/\/$/, '')}/api/v1`;

export default async function NewProductPageRoute({
  searchParams,
}: {
  searchParams: Promise<{ copyFrom?: string; fromCategory?: string; categoryId?: string }>;
}) {
  const params = await searchParams;
  const copyFromId = params?.copyFrom;
  const fromCategory = params?.fromCategory ?? '';
  const categoryIdFromUrl = params?.categoryId ?? '';

  let initialCopyData: CopiedProductData | null = null;
  let copyError: string | null = null;

  if (copyFromId) {
    try {
      const productRes = await apiFetch(`${API_URL}/products/${copyFromId}`, {
        cache: 'no-store',
      });
      if (!productRes.ok) {
        copyError = 'Не удалось загрузить товар для копирования';
      } else {
        const product: ProductForCopy = await productRes.json();
        const catId = product.categoryId || product.category?.id;
        let categoryAttributes: CategoryAttributeForCopy[] = [];
        if (catId) {
          const attrsRes = await apiFetch(`${API_URL}/categories/${catId}/attributes`, {
            cache: 'no-store',
          });
          if (attrsRes.ok) {
            const attrsData = await attrsRes.json();
            categoryAttributes = attrsData.sort(
              (a: CategoryAttributeForCopy, b: CategoryAttributeForCopy) =>
                (a.order || 0) - (b.order || 0)
            );
          }
        }
        let rawComponents: unknown = [];
        try {
          const compRes = await apiFetch(`${API_URL}/product-components/product/${copyFromId}`, {
            cache: 'no-store',
          });
          if (compRes.ok) {
            rawComponents = await compRes.json();
          }
        } catch {
          // без комплектующих копия всё равно возможна
        }
        initialCopyData = mapProductToCopyData(product, categoryAttributes, rawComponents);
      }
    } catch {
      copyError = 'Не удалось загрузить товар для копирования';
    }
  }

  return (
    <ProductCreatePage
      fromCategory={fromCategory}
      categoryIdFromUrl={categoryIdFromUrl}
      copyFromProductId={copyFromId ?? null}
      initialCopyData={initialCopyData}
      copyError={copyError}
      isCopyMode={!!copyFromId}
    />
  );
}
