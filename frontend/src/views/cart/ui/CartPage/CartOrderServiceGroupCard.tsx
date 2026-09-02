'use client';

import Link from 'next/link';

import type { CartSectionId } from '@/views/cart/lib/build-cart-sections';
import type { OrderServiceGroup } from '@/views/cart/lib/cart-order-service-groups';
import { buildRoomsParam } from '@/views/cart/lib/cart-url-utils';

import { ApprovedOrderBadge, ReviewInProgressBadge } from './CartItemStatusIcons';
import styles from './CartPage.module.css';

type CartOrderServiceGroupCardProps = {
  group: OrderServiceGroup;
  sectionId: CartSectionId;
  orderIdForServices?: string;
  index: number;
};

export function CartOrderServiceGroupCard({
  group,
  sectionId,
  orderIdForServices,
  index: _index,
}: CartOrderServiceGroupCardProps) {
  const roomsForPreset = group.rooms.map((room) => ({
    name: room.roomName,
    items: room.items.map((i) => ({
      itemId: i.itemId,
      quantity: i.quantity,
    })),
  }));
  const queryParams = new URLSearchParams();
  if (roomsForPreset.length > 0) {
    queryParams.set('rooms', buildRoomsParam(roomsForPreset));
  }
  if (orderIdForServices) {
    queryParams.set('orderId', orderIdForServices);
  }
  const query = queryParams.toString();
  const orderServiceHref = group.categorySlug
    ? `/catalog/services/${group.categorySlug}${query ? `?${query}` : ''}`
    : '/catalog/services';
  const positionCount = group.rooms.reduce((sum, room) => sum + room.items.length, 0);

  return (
    <div className={`${styles.cartItem} ${styles.cartItemNoImage}`}>
      <Link href={orderServiceHref} className={styles.serviceItemLink}>
        <div className={styles.itemInfo}>
          <span className={styles.itemName}>
            {group.categoryName} ({positionCount})
          </span>
          <ul className={styles.serviceItemLines}>
            {group.rooms.map((room, roomIndex) => (
              <li key={`${group.categoryName}-${roomIndex}`}>
                <div className={styles.serviceRoomTitle}>
                  {room.roomName} ({room.items.length})
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
        <span className={styles.totalPrice}>{group.total.toLocaleString('ru-RU')} ₽</span>
      </div>
      <div className={styles.itemActionsColumn}>
        {sectionId === 'section3' ? <ApprovedOrderBadge /> : <ReviewInProgressBadge />}
      </div>
    </div>
  );
}
