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

function ServiceItemIcon() {
  return (
    <div className={styles.serviceItemIcon} aria-hidden>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        width={40}
        height={40}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
        />
      </svg>
    </div>
  );
}

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
    <div className={styles.cartItem}>
      <Link href={serviceHref} className={styles.serviceItemLink}>
        <ServiceItemIcon />
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
