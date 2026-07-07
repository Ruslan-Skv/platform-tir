'use client';

import { XMarkIcon } from '@heroicons/react/24/outline';

import type { Dispatch, SetStateAction } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { parseCartPrice } from '@/shared/api/cart';
import type { UserOrder } from '@/shared/api/user-orders';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import type { CartProductItem, CartSectionId } from '@/views/cart/lib/build-cart-sections';

import { CartItemActions } from './CartItemActions';
import styles from './CartPage.module.css';

type CartProductItemCardProps = {
  item: CartProductItem;
  sectionId: CartSectionId;
  isUpdating: boolean;
  managerComment?: string;
  dismissedManagerCommentIds: Set<string>;
  setDismissedManagerCommentIds: Dispatch<SetStateAction<Set<string>>>;
  cartItemIdsInApprovedOrder: Set<string>;
  cartItemIdsInOrder: Set<string>;
  pendingReviewOrder: UserOrder | null;
  addToOrderInProgress: Set<string>;
  onAddToOrder: (cartItemId: string) => void;
  onQuantityChange: (cartItemId: string, quantity: number) => void;
  onRemove: (cartItemId: string) => void;
};

function parseProductQuantity(quantity: unknown): number {
  let parsed: number;
  if (typeof quantity === 'number') {
    parsed = quantity;
  } else if (typeof quantity === 'string') {
    parsed = parseInt(quantity, 10);
  } else {
    parsed = 1;
  }
  if (isNaN(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function CartProductItemCard({
  item,
  sectionId,
  isUpdating,
  managerComment,
  dismissedManagerCommentIds,
  setDismissedManagerCommentIds,
  cartItemIdsInApprovedOrder,
  cartItemIdsInOrder,
  pendingReviewOrder,
  addToOrderInProgress,
  onAddToOrder,
  onQuantityChange,
  onRemove,
}: CartProductItemCardProps) {
  const quantity = parseProductQuantity(item.quantity);
  const itemTotal = parseCartPrice(item.product.price) * quantity;

  return (
    <div className={styles.cartItem}>
      <Link href={`/product/${item.product.slug}`} className={styles.itemImage}>
        <Image
          src={item.product.images?.[0] || '/images/products/door-placeholder.jpg'}
          alt={item.product.name}
          width={88}
          height={88}
          className={styles.image}
        />
      </Link>

      <div className={styles.itemInfo}>
        <Link href={`/product/${item.product.slug}`} className={styles.itemName}>
          {item.product.name}
        </Link>
        <p className={styles.itemCategory}>{item.product.category.name}</p>
        <p className={styles.itemPrice}>{item.product.price.toLocaleString()} ₽ за шт.</p>
        {(item.size || item.openingSide || item.product.stock !== undefined) && (
          <div className={styles.itemOptionsRow}>
            {(item.size || item.openingSide) && (
              <div className={styles.itemOptions}>
                {item.size && <span className={styles.itemOption}>Размер: {item.size}</span>}
                {item.openingSide && (
                  <span className={styles.itemOption}>Сторона открывания: {item.openingSide}</span>
                )}
              </div>
            )}
            {item.product.stock !== undefined &&
              (() => {
                const av = getProductAvailability(item.product.stock, item.product.onOrder);
                const badgeClass =
                  av === 'in_stock'
                    ? styles.inStockBadge
                    : av === 'on_order'
                      ? styles.onOrderBadge
                      : styles.soldOutBadge;
                return <span className={badgeClass}>{PRODUCT_AVAILABILITY_LABEL[av]}</span>;
              })()}
          </div>
        )}
        {managerComment && !dismissedManagerCommentIds.has(item.id) && (
          <div className={styles.itemManagerComment}>
            <button
              type="button"
              className={styles.itemManagerCommentClose}
              onClick={() => setDismissedManagerCommentIds((prev) => new Set(prev).add(item.id))}
              aria-label="Закрыть рекомендации менеджера"
              title="Закрыть"
            >
              <XMarkIcon className={styles.itemManagerCommentCloseIcon} />
            </button>
            <span className={styles.itemManagerCommentLabel}>Рекомендации менеджера:</span>
            <span className={styles.itemManagerCommentText}>{managerComment}</span>
          </div>
        )}
      </div>

      <div className={styles.itemQuantityAndTotal}>
        <div className={styles.itemQuantity}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={() => onQuantityChange(item.id, quantity - 1)}
            disabled={isUpdating}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span className={styles.quantityValue}>{quantity}</span>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={() => onQuantityChange(item.id, quantity + 1)}
            disabled={isUpdating}
            aria-label="Увеличить количество"
          >
            +
          </button>
        </div>
        <span className={styles.totalPrice}>{itemTotal.toLocaleString()} ₽</span>
      </div>

      <CartItemActions
        cartItemId={item.id}
        sectionId={sectionId}
        isUpdating={isUpdating}
        cartItemIdsInApprovedOrder={cartItemIdsInApprovedOrder}
        cartItemIdsInOrder={cartItemIdsInOrder}
        pendingReviewOrder={pendingReviewOrder}
        addToOrderInProgress={addToOrderInProgress}
        onAddToOrder={onAddToOrder}
        onRemove={() => onRemove(item.id)}
        removeTitle={
          cartItemIdsInApprovedOrder.has(item.id)
            ? 'Удалить (заказ будет переоформлен)'
            : cartItemIdsInOrder.has(item.id)
              ? 'Нельзя удалить: товар в заказе на проверке'
              : 'Удалить товар'
        }
        removeAriaLabel="Удалить товар"
      />
    </div>
  );
}
