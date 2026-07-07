'use client';

import Image from 'next/image';
import Link from 'next/link';

import { parseCartPrice } from '@/shared/api/cart';
import type { UserOrder } from '@/shared/api/user-orders';
import type { CartComponentItem, CartSectionId } from '@/views/cart/lib/build-cart-sections';

import { CartItemActions } from './CartItemActions';
import styles from './CartPage.module.css';

type CartComponentItemCardProps = {
  item: CartComponentItem;
  sectionId: CartSectionId;
  isUpdating: boolean;
  cartItemIdsInApprovedOrder: Set<string>;
  cartItemIdsInOrder: Set<string>;
  pendingReviewOrder: UserOrder | null;
  addToOrderInProgress: Set<string>;
  onAddToOrder: (cartItemId: string) => void;
  onQuantityChange: (componentId: string, quantity: number) => Promise<void>;
  onRemove: (componentId: string) => Promise<void>;
};

function parseComponentQuantity(quantity: unknown): number {
  let parsed: number;
  if (typeof quantity === 'number') {
    parsed = quantity;
  } else if (typeof quantity === 'string') {
    parsed = parseFloat(quantity);
  } else {
    parsed = 1;
  }
  if (isNaN(parsed) || parsed <= 0) {
    return 1;
  }
  return parsed;
}

function isStoikaKorobka(component: CartComponentItem['component']): boolean {
  return (
    /стойка\s+коробки/i.test(component.name) ||
    /стойка\s+коробки/i.test(component.type) ||
    (component.name === 'Коробка' && !/стойки/i.test(component.type ?? ''))
  );
}

export function CartComponentItemCard({
  item,
  sectionId,
  isUpdating,
  cartItemIdsInApprovedOrder,
  cartItemIdsInOrder,
  pendingReviewOrder,
  addToOrderInProgress,
  onAddToOrder,
  onQuantityChange,
  onRemove,
}: CartComponentItemCardProps) {
  const quantity = parseComponentQuantity(item.quantity);
  const stoika = isStoikaKorobka(item.component);
  const step = stoika ? 0.5 : 1;
  const minQty = stoika ? 0.5 : 1;
  const displayQty = step === 0.5 && quantity % 1 !== 0 ? quantity.toFixed(1) : String(quantity);
  const newQtyDown = Math.round((quantity - step) * 2) / 2;
  const newQtyUp = Math.round((quantity + step) * 2) / 2;
  const itemTotal = parseCartPrice(item.component.price) * quantity;
  const componentId = item.componentId!;

  return (
    <div className={styles.cartItem}>
      <Link href={`/product/${item.component.product.slug}`} className={styles.itemImage}>
        <Image
          src={item.component.image || '/images/products/door-placeholder.jpg'}
          alt={item.component.name}
          width={88}
          height={88}
          className={styles.image}
        />
      </Link>

      <div className={styles.itemInfo}>
        <Link href={`/product/${item.component.product.slug}`} className={styles.itemName}>
          {item.component.name}
        </Link>
        <p className={styles.itemCategory}>
          {item.component.type} • {item.component.product.name}
        </p>
        <p className={styles.itemPrice}>{item.component.price.toLocaleString()} ₽ за шт.</p>
      </div>

      <div className={styles.itemQuantityAndTotal}>
        <div className={styles.itemQuantity}>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={async () => {
              if (newQtyDown < minQty) {
                await onRemove(componentId);
              } else {
                await onQuantityChange(componentId, newQtyDown);
              }
            }}
            disabled={isUpdating}
            aria-label="Уменьшить количество"
          >
            −
          </button>
          <span className={styles.quantityValue}>{displayQty}</span>
          <button
            type="button"
            className={styles.quantityButton}
            onClick={() => onQuantityChange(componentId, newQtyUp)}
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
        onRemove={() => onRemove(componentId)}
        removeTitle={
          cartItemIdsInApprovedOrder.has(item.id)
            ? 'Удалить (заказ будет переоформлен)'
            : cartItemIdsInOrder.has(item.id)
              ? 'Нельзя удалить: товар в заказе на проверке'
              : 'Удалить комплектующее'
        }
        removeAriaLabel="Удалить комплектующее"
      />
    </div>
  );
}
