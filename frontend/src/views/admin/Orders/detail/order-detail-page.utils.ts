import { ORDER_DETAIL_EVENT_LABELS } from './order-detail-page.constants';
import type {
  OrderDetail,
  OrderHistoryEvent,
  OrderServiceGroup,
  OrderServiceItem,
} from './order-detail-page.types';

export function formatDuration(ms: number): string {
  if (ms < 0) return '—';
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours} ч`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} мин`);
  return parts.join(' ');
}

/** Формат для счётчика проверки: минуты:секунды (например 12:35). */
export function formatDurationMinutesSeconds(ms: number): string {
  if (ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function buildOrderHistory(order: OrderDetail): OrderHistoryEvent[] {
  const managerName = order.processedByManager
    ? `${order.processedByManager.firstName ?? ''} ${order.processedByManager.lastName ?? ''}`.trim() ||
      order.processedByManager.email
    : 'Менеджер';
  const isManagerCreated = Boolean(order.createdByManagerId);
  const customerName = isManagerCreated
    ? `${order.customerFirstName ?? ''} ${order.customerMiddleName ?? ''} ${
        order.customerLastName ?? ''
      }`
        .replace(/\s+/g, ' ')
        .trim()
    : `${order.customerFirstName ?? order.user?.firstName ?? ''} ${
        order.customerLastName ?? order.user?.lastName ?? ''
      }`.trim();
  const customerLabel =
    customerName ||
    (isManagerCreated ? order.customerEmail : order.customerEmail || order.user?.email) ||
    'Покупатель';

  if (order.orderEvents && order.orderEvents.length > 0) {
    const fromEvents: OrderHistoryEvent[] = order.orderEvents.map((e) => {
      const author =
        e.actor === 'manager' && e.user
          ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() ||
            e.user.email ||
            'Менеджер'
          : e.actor === 'customer'
            ? customerLabel
            : e.user
              ? `${e.user.firstName ?? ''} ${e.user.lastName ?? ''}`.trim() || e.user.email || '—'
              : '—';
      return {
        at: e.createdAt,
        label: ORDER_DETAIL_EVENT_LABELS[e.type] ?? e.type,
        author,
      };
    });
    const firstEventAt =
      fromEvents.length > 0 ? Math.min(...fromEvents.map((e) => new Date(e.at).getTime())) : 0;
    const creatorLabel = order.createdByManagerId ? managerName : customerLabel;
    const legacy: OrderHistoryEvent[] = [];
    if (order.createdAt && new Date(order.createdAt).getTime() < firstEventAt) {
      legacy.push({ at: order.createdAt, label: 'Заказ создан', author: creatorLabel });
    }
    if (
      order.submittedForReviewAt &&
      new Date(order.submittedForReviewAt).getTime() < firstEventAt
    ) {
      legacy.push({
        at: order.submittedForReviewAt,
        label: 'Отправлен на проверку',
        author: creatorLabel,
      });
    }
    if (order.approvedAt && new Date(order.approvedAt).getTime() < firstEventAt) {
      legacy.push({ at: order.approvedAt, label: 'Заказ проверен', author: managerName });
    }
    if (
      order.returnedForCorrectionAt &&
      new Date(order.returnedForCorrectionAt).getTime() < firstEventAt
    ) {
      legacy.push({
        at: order.returnedForCorrectionAt,
        label: 'Отправлен на доработку',
        author: managerName,
      });
    }
    const events = [...legacy, ...fromEvents];
    events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
    for (let i = 1; i < events.length; i++) {
      const prev = new Date(events[i - 1].at).getTime();
      const curr = new Date(events[i].at).getTime();
      events[i].duration = formatDuration(curr - prev);
    }
    return events;
  }

  const events: OrderHistoryEvent[] = [];
  const push = (at: string | null | undefined, label: string, author: string) => {
    if (at) events.push({ at, label, author });
  };
  const creatorLabel = order.createdByManagerId ? managerName : customerLabel;

  push(order.createdAt, 'Заказ создан', creatorLabel);
  push(order.submittedForReviewAt, 'Отправлен на проверку', creatorLabel);
  push(order.approvedAt, 'Заказ проверен', managerName);
  push(order.returnedForCorrectionAt, 'Отправлен на доработку', managerName);
  push(order.cancelledAt, 'Заказ отменён', managerName);
  push(order.shippedAt, 'Заказ отправлен', managerName);
  push(order.deliveredAt, 'Заказ доставлен', managerName);
  push(order.refundedAt, 'Оформлен возврат', managerName);
  events.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
  for (let i = 1; i < events.length; i++) {
    const prev = new Date(events[i - 1].at).getTime();
    const curr = new Date(events[i].at).getTime();
    events[i].duration = formatDuration(curr - prev);
  }
  return events;
}

export function formatEventDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatOrderDetailPrice(value: string | number): string {
  return Number(value).toLocaleString('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  });
}

export function groupOrderServiceItems(orderServiceItems: OrderServiceItem[]): OrderServiceGroup[] {
  const groups: OrderServiceGroup[] = [];
  const byCategory = new Map<string, Map<string, OrderServiceItem[]>>();
  for (const svc of orderServiceItems) {
    const categoryKey = svc.categoryName || 'Услуги';
    const roomKey = svc.roomName || 'Помещение';
    let roomsMap = byCategory.get(categoryKey);
    if (!roomsMap) {
      roomsMap = new Map<string, OrderServiceItem[]>();
      byCategory.set(categoryKey, roomsMap);
    }
    const list = roomsMap.get(roomKey);
    if (list) {
      list.push(svc);
    } else {
      roomsMap.set(roomKey, [svc]);
    }
  }
  byCategory.forEach((roomsMap, categoryName) => {
    const rooms: Array<{ roomName: string; items: OrderServiceItem[] }> = [];
    roomsMap.forEach((items, roomName) => {
      rooms.push({ roomName, items });
    });
    groups.push({ categoryName, rooms });
  });
  return groups;
}
