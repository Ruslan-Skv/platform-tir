export type SupplierPriceErrorCode =
  | 'PRODUCT_NOT_FOUND'
  | 'PRICE_NOT_FOUND'
  | 'TIMEOUT'
  | 'INVALID_URL'
  | 'FETCH_ERROR'
  | 'UNKNOWN';

export interface SupplierPriceUpdateError {
  message: string;
  errorCode?: SupplierPriceErrorCode;
}

export interface SupplierPriceUpdateErrorItem extends SupplierPriceUpdateError {
  productId: string;
  productName: string;
  error: string;
}

export function getSupplierPriceErrorLabel(error: SupplierPriceUpdateError): string {
  if (error.errorCode === 'PRODUCT_NOT_FOUND' || error.message === 'Товар не найден') {
    return 'Товар не найден';
  }
  return error.message;
}

export function formatSupplierPriceUpdateMessage(data: {
  total: number;
  updated: number;
  changed: number;
  errors?: SupplierPriceUpdateErrorItem[];
}): string {
  if (data.total === 0) {
    return 'Среди выбранных нет товаров с ссылкой на товар поставщика';
  }

  const parts = [
    `Обработано: ${data.total}`,
    `обновлено: ${data.updated}`,
    `цена изменилась: ${data.changed}`,
  ];

  const errors = data.errors ?? [];
  if (errors.length === 0) return parts.join(', ');

  const notFoundCount = errors.filter(
    (item) => item.errorCode === 'PRODUCT_NOT_FOUND' || item.error === 'Товар не найден'
  ).length;
  const otherCount = errors.length - notFoundCount;

  if (notFoundCount > 0) {
    parts.push(`не найдено у поставщика: ${notFoundCount}`);
  }
  if (otherCount > 0) {
    parts.push(`других ошибок: ${otherCount}`);
  }
  parts.push('Подробности — наведите на значок в колонке «Цена поставщика»');

  return parts.join('. ');
}

export function mergeSupplierPriceUpdateErrors(
  prev: Record<string, SupplierPriceUpdateError>,
  selectedIds: string[],
  errors: SupplierPriceUpdateErrorItem[] | undefined
): Record<string, SupplierPriceUpdateError> {
  const next = { ...prev };
  for (const id of selectedIds) {
    delete next[id];
  }
  for (const item of errors ?? []) {
    next[item.productId] = {
      message: item.error,
      errorCode: item.errorCode,
    };
  }
  return next;
}
