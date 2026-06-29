import { transliterate } from '@/views/admin/Catalog/Products/shared/product-form-utils';

export function slugifyPublicOfferName(name: string): string {
  return transliterate(name);
}
