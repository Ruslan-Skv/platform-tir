export const ORDERS_PAGE_LIMIT = 20;

export type OrdersListKind = 'all' | 'product' | 'service' | 'delivery';

export const ORDERS_LIST_KIND_OPTIONS: { value: OrdersListKind; label: string }[] = [
  { value: 'all', label: 'Все' },
  { value: 'product', label: 'Товары' },
  { value: 'service', label: 'Услуги' },
  { value: 'delivery', label: 'Доставка' },
];

export const SERVICE_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  CONFIRMED: 'Подтверждён',
  CANCELLED: 'Отменён',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает',
  PENDING_REVIEW: 'На проверке',
  RETURNED_FOR_CORRECTION: 'На доработке у покупателя',
  APPROVED: 'Заказ проверен',
  PROCESSING: 'В обработке',
  SHIPPED: 'Отправлен',
  DELIVERED: 'Доставлен',
  CANCELLED: 'Отменён',
  REFUNDED: 'Возврат',
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Ожидает оплаты',
  PAID: 'Оплачен',
  FAILED: 'Ошибка',
  REFUNDED: 'Возвращён',
};

export const PRODUCT_ORDER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'На проверке' },
  { value: 'APPROVED', label: 'Проверен' },
  { value: 'RETURNED_FOR_CORRECTION', label: 'На доработке' },
  { value: 'PENDING', label: 'Ожидают' },
  { value: 'PROCESSING', label: 'В обработке' },
  { value: 'SHIPPED', label: 'Отправлены' },
  { value: 'DELIVERED', label: 'Доставлены' },
  { value: 'CANCELLED', label: 'Отменены' },
];

export const SERVICE_ORDER_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Ожидают' },
  { value: 'CONFIRMED', label: 'Подтверждены' },
  { value: 'CANCELLED', label: 'Отменены' },
];

export const PAYMENT_STATUS_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'PENDING', label: 'Ожидают' },
  { value: 'PAID', label: 'Оплачены' },
  { value: 'REFUNDED', label: 'Возвраты' },
];
