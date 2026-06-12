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
    <div className={styles.cartItem}>
      <Link href={orderServiceHref} className={styles.serviceItemLink}>
        <ServiceItemIcon />
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
