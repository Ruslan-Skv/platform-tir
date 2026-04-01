/** Снимок полей карточки товара в админке для проверки обязательных значений и подсветки. */
export interface AdminProductFormSnapshot {
  name: string;
  categoryId: string;
  supplierId: string;
  supplierProductUrl: string;
  supplierSku: string;
  price: string;
  stock: number;
  sizes: string[];
  images: string[];
}

/** Возвращает подписи незаполненных обязательных полей (по порядку проверки). */
export function validateAdminProductRequiredFields(s: AdminProductFormSnapshot): string[] {
  const missing: string[] = [];
  if (!s.name.trim()) missing.push('Название');
  if (!s.categoryId.trim()) missing.push('Категория');
  if (!s.supplierId.trim()) missing.push('Поставщик');
  if (!s.supplierProductUrl.trim()) missing.push('Ссылка на товар поставщика');

  const priceRaw = String(s.price).trim().replace(',', '.');
  const priceNum = parseFloat(priceRaw);
  if (priceRaw === '' || !Number.isFinite(priceNum) || priceNum <= 0) {
    missing.push('Цена');
  }

  if (!Number.isFinite(s.stock) || s.stock < 0) {
    missing.push('Остаток на складе');
  }

  const cleanedSizes = s.sizes.map((size) => size.trim()).filter((size) => size.length > 0);
  if (cleanedSizes.length === 0) {
    missing.push('Размеры');
  }

  const hasImage = s.images.some((url) => url.trim().length > 0);
  if (!hasImage) {
    missing.push('Изображение');
  }

  return missing;
}

export function adminProductFieldHighlightClass(
  filled: boolean,
  mod: { fieldHighlightEmpty: string; fieldHighlightFilled: string }
): string {
  return filled ? mod.fieldHighlightFilled : mod.fieldHighlightEmpty;
}
