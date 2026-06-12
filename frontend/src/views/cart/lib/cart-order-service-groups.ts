import type { UserOrder } from '@/shared/api/user-orders';

export type OrderServiceGroup = {
  categoryName: string;
  categorySlug: string;
  rooms: Array<{
    roomName: string;
    items: Array<{
      itemId: string;
      name: string;
      quantity: number;
      unit: string;
      amount: number;
    }>;
    total: number;
  }>;
  total: number;
};

export function getDetachedCategoriesForOrder(orderId?: string | null): Set<string> {
  if (!orderId || typeof window === 'undefined') return new Set<string>();
  try {
    const raw = window.sessionStorage.getItem('detached_service_categories');
    const entries: Array<{
      orderId: string;
      categorySlug?: string;
      categoryName?: string;
    }> = raw ? JSON.parse(raw) : [];
    const filtered = entries.filter((e) => e.orderId === orderId);
    const keys = new Set<string>();
    for (const entry of filtered) {
      if (entry.categorySlug) keys.add(entry.categorySlug);
      if (entry.categoryName) keys.add(entry.categoryName);
    }
    return keys;
  } catch {
    return new Set<string>();
  }
}

/** Группировка услуг заказа по категориям и помещениям для отображения карточек. */
export function groupOrderServiceItems(
  items: UserOrder['orderServiceItems'],
  orderId?: string | null
): OrderServiceGroup[] {
  if (!items?.length) return [];
  const detachedCategories = getDetachedCategoriesForOrder(orderId);
  const byCategory = new Map<
    string,
    { slug: string; rooms: Map<string, OrderServiceGroup['rooms'][number]['items']> }
  >();
  for (const o of items) {
    const cat = o.categoryName || 'Услуги';
    const slug = o.serviceCatalogItem?.category?.slug ?? '';
    if (detachedCategories.has(slug) || detachedCategories.has(cat)) continue;
    const roomName = o.roomName || 'Помещение';
    const amount = typeof o.amount === 'string' ? parseFloat(o.amount) : Number(o.amount);
    const line = {
      itemId: o.serviceCatalogItemId,
      name: o.name,
      quantity: o.quantity,
      unit: o.unit,
      amount,
    };
    const entry = byCategory.get(cat);
    if (entry) {
      const room = entry.rooms.get(roomName);
      if (room) {
        room.push(line);
      } else {
        entry.rooms.set(roomName, [line]);
      }
      if (slug && !entry.slug) entry.slug = slug;
    } else {
      const rooms = new Map<string, OrderServiceGroup['rooms'][number]['items']>();
      rooms.set(roomName, [line]);
      byCategory.set(cat, { slug, rooms });
    }
  }
  return Array.from(byCategory.entries()).map(([categoryName, { slug, rooms }]) => {
    const roomsList = Array.from(rooms.entries()).map(([roomName, list]) => {
      const total = list.reduce((s, i) => s + i.amount, 0);
      return { roomName, items: list, total };
    });
    const total = roomsList.reduce((s, r) => s + r.total, 0);
    return { categoryName, categorySlug: slug, rooms: roomsList, total };
  });
}
