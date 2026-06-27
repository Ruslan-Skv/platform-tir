/** Поля товара, не отдаваемые в публичном API. */
const PUBLIC_PRODUCT_OMIT_KEYS = [
  'costPrice',
  'createdById',
  'updatedById',
  'createdBy',
  'updatedBy',
  'suppliers',
] as const;

/** Поля отзыва, не отдаваемые публично. */
const PUBLIC_REVIEW_OMIT_KEYS = ['userEmail'] as const;

function omitKeys<T extends Record<string, unknown>>(obj: T, keys: readonly string[]): T {
  const out = { ...obj };
  for (const key of keys) {
    delete out[key];
  }
  return out;
}

/** Убирает внутренние поля товара перед ответом публичному клиенту. */
export function stripProductForPublic<T extends Record<string, unknown>>(product: T): T {
  let result = omitKeys(product, PUBLIC_PRODUCT_OMIT_KEYS);

  if (Array.isArray(result.reviews)) {
    result = {
      ...result,
      reviews: result.reviews.map((review) =>
        typeof review === 'object' && review !== null
          ? omitKeys(review as Record<string, unknown>, PUBLIC_REVIEW_OMIT_KEYS)
          : review,
      ),
    } as T;
  }

  return result;
}

export function stripProductsForPublic<T extends Record<string, unknown>>(products: T[]): T[] {
  return products.map(stripProductForPublic);
}
