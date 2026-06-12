'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

import type { UserOrder } from '@/shared/api/user-orders';
import type { CartSectionId } from '@/views/cart/lib/build-cart-sections';

import { ApprovedOrderBadge, ReviewInProgressBadge } from './CartItemStatusIcons';
import styles from './CartPage.module.css';

type CartItemActionsProps = {
  cartItemId: string;
  sectionId: CartSectionId;
  isUpdating: boolean;
  cartItemIdsInApprovedOrder: Set<string>;
  cartItemIdsInOrder: Set<string>;
  pendingReviewOrder: UserOrder | null;
  addToOrderInProgress: Set<string>;
  onAddToOrder: (cartItemId: string) => void;
  onRemove: () => void;
  removeTitle: string;
  removeAriaLabel: string;
};

export function CartItemActions({
  cartItemId,
  sectionId,
  isUpdating,
  cartItemIdsInApprovedOrder,
  cartItemIdsInOrder,
  pendingReviewOrder,
  addToOrderInProgress,
  onAddToOrder,
  onRemove,
  removeTitle,
  removeAriaLabel,
}: CartItemActionsProps) {
  return (
    <div className={styles.itemActionsColumn}>
      {cartItemIdsInApprovedOrder.has(cartItemId) ? (
        <ApprovedOrderBadge />
      ) : cartItemIdsInOrder.has(cartItemId) ? (
        <ReviewInProgressBadge />
      ) : pendingReviewOrder && sectionId !== 'section1' ? (
        <button
          type="button"
          className={styles.addToOrderButton}
          onClick={() => onAddToOrder(cartItemId)}
          disabled={addToOrderInProgress.has(cartItemId)}
          aria-label="Проверить"
        >
          {addToOrderInProgress.has(cartItemId) ? '…' : 'Проверить'}
        </button>
      ) : null}
      <button
        type="button"
        className={styles.removeButton}
        onClick={onRemove}
        disabled={isUpdating || cartItemIdsInOrder.has(cartItemId)}
        title={removeTitle}
        aria-label={removeAriaLabel}
      >
        <TrashIcon className={styles.removeButtonIcon} />
      </button>
    </div>
  );
}
