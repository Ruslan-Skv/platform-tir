import type { CartItem } from '@/shared/api/cart';
import type { UserOrder } from '@/shared/api/user-orders';

type OrderItem = NonNullable<UserOrder['items']>[number];

function matchCartItemsToOrderItems(orderItems: OrderItem[], cart: CartItem[]): Set<string> {
  const ids = new Set<string>();
  const usedCartIds = new Set<string>();
  for (const o of orderItems) {
    const oProductId = o.productId;
    const oQty = o.quantity;
    const oSize = o.size ?? null;
    const oOpening = o.openingSide ?? null;
    const matching = cart.filter((c) => {
      if (usedCartIds.has(c.id)) return false;
      const cProductId = c.product?.id ?? c.component?.product?.id;
      if (!cProductId || cProductId !== oProductId) return false;
      const cQty = Math.round(Number(c.quantity));
      const cSize = c.size ?? null;
      const cOpening = c.openingSide ?? null;
      return cQty === oQty && cSize === oSize && cOpening === oOpening;
    });
    if (matching.length === 0) continue;
    matching.sort((a, b) => (a.id < b.id ? -1 : 1));
    const chosen = matching[0];
    usedCartIds.add(chosen.id);
    ids.add(chosen.id);
  }
  return ids;
}

/** ID позиций корзины в заказе на проверке или на доработке (секция 2). */
export function buildCartItemIdsInReviewOrder(
  cart: CartItem[],
  pendingReviewOrder: UserOrder | null,
  returnedForCorrectionOrder: UserOrder | null
): Set<string> {
  const order = pendingReviewOrder ?? returnedForCorrectionOrder ?? null;
  if (!order?.items?.length || !cart.length) return new Set<string>();
  return matchCartItemsToOrderItems(order.items, cart);
}

/** ID позиций корзины в проверенном заказе (секция 3). */
export function buildCartItemIdsInApprovedOrder(
  cart: CartItem[],
  approvedOrder: UserOrder | null
): Set<string> {
  if (!approvedOrder?.items?.length || !cart.length) return new Set<string>();
  return matchCartItemsToOrderItems(approvedOrder.items, cart);
}

/** ID позиций для секции 1: ещё не отправлены на проверку. */
export function buildSection1ItemIds(
  cart: CartItem[],
  cartItemIdsInReviewOrder: Set<string>,
  cartItemIdsInApprovedOrder: Set<string>
): Set<string> {
  return new Set(
    cart
      .filter(
        (item) => !cartItemIdsInReviewOrder.has(item.id) && !cartItemIdsInApprovedOrder.has(item.id)
      )
      .map((item) => item.id)
  );
}

/** Комментарий менеджера по позиции корзины. */
export function buildManagerCommentByCartItemId(
  cart: CartItem[],
  approvedOrder: UserOrder | null,
  pendingReviewOrder: UserOrder | null,
  returnedForCorrectionOrder: UserOrder | null
): Map<string, string> {
  const map = new Map<string, string>();
  const order = approvedOrder ?? pendingReviewOrder ?? returnedForCorrectionOrder ?? null;
  if (!order?.items?.length || !cart.length) return map;
  for (const o of order.items) {
    const comment =
      typeof o.managerComment === 'string' && o.managerComment.trim()
        ? o.managerComment.trim()
        : null;
    if (!comment) continue;
    const productId = o.productId ?? o.product?.id ?? null;
    const size = o.size ?? null;
    const openingSide = o.openingSide ?? null;
    for (const c of cart) {
      const cProductId = c.product?.id ?? null;
      if (cProductId !== productId) continue;
      if ((c.size ?? null) !== size) continue;
      if ((c.openingSide ?? null) !== openingSide) continue;
      map.set(c.id, comment);
    }
  }
  return map;
}
