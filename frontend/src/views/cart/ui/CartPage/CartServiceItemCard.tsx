'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

import Link from 'next/link';

import type { CartServiceItem } from '@/shared/api/cart';
import { buildRoomsParam } from '@/views/cart/lib/cart-url-utils';

import styles from './CartPage.module.css';

type CartServiceItemCardProps = {
  item: CartServiceItem;
  onRemove: (itemId: string) => void;
};

export function CartServiceItemCard({ item, onRemove }: CartServiceItemCardProps) {
  const legacyItems = Array.isArray(item.items) ? item.items : [];
  const roomsForPreset =
    item.rooms && item.rooms.length > 0
      ? item.rooms
      : [
          {
            name: 'Помещение',
            items: (item.itemsWithDetails ?? legacyItems).map((i) => ({
              itemId: i.itemId,
              quantity: i.quantity,
            })),
          },
        ];
  const displayRooms =
    item.roomsWithDetails && item.roomsWithDetails.length > 0
      ? item.roomsWithDetails
      : [
          {
            name: 'Помещение',
            items:
              item.itemsWithDetails && item.itemsWithDetails.length > 0
                ? item.itemsWithDetails
                : legacyItems.map((i) => ({
                    itemId: i.itemId,
                    quantity: i.quantity,
                    name: '—',
                    unit: '—',
                    price: 0,
                    amount: 0,
                  })),
            total: item.total ?? 0,
          },
        ];
  const totalPositions = displayRooms.reduce((sum, room) => sum + room.items.length, 0);
  const roomsParam = roomsForPreset.length > 0 ? buildRoomsParam(roomsForPreset) : '';
  const serviceHref = item.category?.slug
    ? `/catalog/services/${item.category.slug}${
        roomsParam ? `?rooms=${encodeURIComponent(roomsParam)}` : ''
      }`
    : '/catalog/services';
  const serviceTotal = item.total != null && item.total > 0 ? item.total : 0;

  return (
    <div className={`${styles.cartItem} ${styles.cartItemNoImage}`}>
      <Link href={serviceHref} className={styles.serviceItemLink}>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>
            {item.category.name} ({totalPositions})
          </span>
          <ul className={styles.serviceItemLines}>
            {displayRooms.map((room, roomIndex) => (
              <li key={`${item.id}-room-${roomIndex}`}>
                <div className={styles.serviceRoomTitle}>
                  {room.name} ({room.items.length})
                </div>
                <ul className={styles.serviceRoomList}>
                  {room.items.map((line) => (
                    <li key={line.itemId} className={styles.serviceItemLine}>
                      {line.name} — {line.quantity} {line.unit}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </div>
      </Link>
      <div className={styles.itemQuantityAndTotal}>
        <span className={styles.totalPrice}>{serviceTotal.toLocaleString('ru-RU')} ₽</span>
      </div>
      <div className={styles.itemActionsColumn}>
        <button
          type="button"
          className={styles.removeButton}
          onClick={() => onRemove(item.id)}
          title="Удалить услуги из корзины"
          aria-label="Удалить услуги"
        >
          <TrashIcon className={styles.removeButtonIcon} />
        </button>
      </div>
    </div>
  );
}
