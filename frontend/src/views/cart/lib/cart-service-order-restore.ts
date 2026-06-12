const RESTORED_SERVICE_ORDERS_KEY = 'restored_service_order_ids';

export function getRestoredServiceOrderIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.sessionStorage.getItem(RESTORED_SERVICE_ORDERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed);
  } catch {
    return new Set();
  }
}

export function markServiceOrderRestored(orderId: string): void {
  if (typeof window === 'undefined') return;
  const current = getRestoredServiceOrderIds();
  current.add(orderId);
  window.sessionStorage.setItem(RESTORED_SERVICE_ORDERS_KEY, JSON.stringify(Array.from(current)));
}
