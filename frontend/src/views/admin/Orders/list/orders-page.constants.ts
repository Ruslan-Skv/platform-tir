export const ORDERS_PAGE_LIMIT = 20;

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
