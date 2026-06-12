export const ORDER_DETAIL_STATUS_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'PENDING', label: 'Ожидает' },
  { value: 'PENDING_REVIEW', label: 'На проверке' },
  { value: 'RETURNED_FOR_CORRECTION', label: 'На доработке у покупателя' },
  { value: 'APPROVED', label: 'Заказ проверен' },
  { value: 'PROCESSING', label: 'В обработке' },
  { value: 'SHIPPED', label: 'Отправлен' },
  { value: 'DELIVERED', label: 'Доставлен' },
  { value: 'CANCELLED', label: 'Отменён' },
  { value: 'REFUNDED', label: 'Возврат' },
];

export const ORDER_DETAIL_EVENT_LABELS: Record<string, string> = {
  created: 'Заказ создан',
  submitted_for_review: 'Отправлен на проверку',
  add_to_review: 'Добавлены товары к заказу на проверке',
  add_to_approved: 'Добавлены товары к проверенному заказу',
  approved: 'Заказ проверен',
  returned_for_correction: 'Отправлен на доработку',
  cancelled: 'Заказ отменён',
  shipped: 'Заказ отправлен',
  delivered: 'Заказ доставлен',
  refunded: 'Оформлен возврат',
  delivery_edited: 'Изменены стоимость или дата доставки',
  customer_edited: 'Изменены данные покупателя',
  item_comment_edited: 'Изменены рекомендации по позиции',
  sent_to_email: 'Заказ отправлен на email покупателю',
};

export const ORDER_DETAIL_POLL_INTERVAL_MS = 15000;
