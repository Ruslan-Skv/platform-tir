import type { CartItem } from '@/shared/api/cart';
import { parseCartPrice } from '@/shared/api/cart';
import type { UserOrder } from '@/shared/api/user-orders';

import { type OrderServiceGroup, groupOrderServiceItems } from './cart-order-service-groups';

export type CartSectionId = 'section1' | 'section2' | 'section3';

export type CartProductItem = CartItem & { product: NonNullable<CartItem['product']> };
export type CartComponentItem = CartItem & { component: NonNullable<CartItem['component']> };

export type CartSection = {
  id: CartSectionId;
  title: string;
  products: CartProductItem[];
  components: CartComponentItem[];
  orderServiceGroups: OrderServiceGroup[];
  productTotal: number;
  serviceTotal: number;
  total: number;
  itemCount: number;
  productCount: number;
  serviceCategoryCount: number;
};

type CartServiceItem = {
  total?: number | null;
  category?: { slug?: string; name?: string } | null;
};

function sumItems(products: CartProductItem[], components: CartComponentItem[]): number {
  let total = 0;
  for (const p of products) {
    const q = Math.max(1, Math.round(Number(p.quantity)));
    total += parseCartPrice(p.product?.price) * q;
  }
  for (const c of components) {
    const q = Math.max(0.5, Number(c.quantity));
    total += parseCartPrice(c.component?.price) * q;
  }
  return total;
}

function countItems(products: CartProductItem[], components: CartComponentItem[]): number {
  let n = 0;
  for (const p of products) n += Math.max(1, Math.round(Number(p.quantity)));
  for (const c of components) n += Math.max(0.5, Number(c.quantity));
  return n;
}

export function buildCartSections(input: {
  cart: CartItem[];
  cartServiceItems: CartServiceItem[];
  section1ItemIds: Set<string>;
  section2ItemIds: Set<string>;
  section3ItemIds: Set<string>;
  pendingReviewOrder: UserOrder | null;
  returnedForCorrectionOrder: UserOrder | null;
  approvedOrder: UserOrder | null;
}): CartSection[] {
  const {
    cart,
    cartServiceItems,
    section1ItemIds,
    section2ItemIds,
    section3ItemIds,
    pendingReviewOrder,
    returnedForCorrectionOrder,
    approvedOrder,
  } = input;

  const s1Products: CartProductItem[] = [];
  const s1Components: CartComponentItem[] = [];
  const s2Products: CartProductItem[] = [];
  const s2Components: CartComponentItem[] = [];
  const s3Products: CartProductItem[] = [];
  const s3Components: CartComponentItem[] = [];

  for (const item of cart) {
    if (item.product != null && item.componentId === null) {
      const p = item as CartProductItem;
      if (section1ItemIds.has(item.id)) s1Products.push(p);
      else if (section2ItemIds.has(item.id)) s2Products.push(p);
      else if (section3ItemIds.has(item.id)) s3Products.push(p);
    } else if (item.component != null && item.productId === null) {
      const c = item as CartComponentItem;
      if (section1ItemIds.has(item.id)) s1Components.push(c);
      else if (section2ItemIds.has(item.id)) s2Components.push(c);
      else if (section3ItemIds.has(item.id)) s3Components.push(c);
    }
  }

  const reviewOrder = pendingReviewOrder ?? returnedForCorrectionOrder ?? null;
  const s2ServiceGroups = groupOrderServiceItems(reviewOrder?.orderServiceItems, reviewOrder?.id);
  const s3ServiceGroups = groupOrderServiceItems(
    approvedOrder?.orderServiceItems,
    approvedOrder?.id
  );
  const s1ServiceTotal = cartServiceItems.reduce(
    (s, i) => s + (i.total != null && i.total > 0 ? i.total : 0),
    0
  );
  const s2ServiceTotal = s2ServiceGroups.reduce((s, g) => s + g.total, 0);
  const s3ServiceTotal = s3ServiceGroups.reduce((s, g) => s + g.total, 0);
  const s1ProductCount = countItems(s1Products, s1Components);
  const s2ProductCount = countItems(s2Products, s2Components);
  const s3ProductCount = countItems(s3Products, s3Components);
  const s1ServiceCategoryCount = cartServiceItems.length;
  const s2ServiceCategoryCount = s2ServiceGroups.length;
  const s3ServiceCategoryCount = s3ServiceGroups.length;

  return [
    {
      id: 'section1',
      title: 'Товары для отправки на проверку',
      products: s1Products,
      components: s1Components,
      orderServiceGroups: [],
      productTotal: sumItems(s1Products, s1Components),
      serviceTotal: s1ServiceTotal,
      total: sumItems(s1Products, s1Components) + s1ServiceTotal,
      itemCount: s1ProductCount + s1ServiceCategoryCount,
      productCount: s1ProductCount,
      serviceCategoryCount: s1ServiceCategoryCount,
    },
    {
      id: 'section2',
      title: 'На проверке у менеджера',
      products: s2Products,
      components: s2Components,
      orderServiceGroups: s2ServiceGroups,
      productTotal: sumItems(s2Products, s2Components),
      serviceTotal: s2ServiceTotal,
      total: sumItems(s2Products, s2Components) + s2ServiceTotal,
      itemCount: s2ProductCount + s2ServiceCategoryCount,
      productCount: s2ProductCount,
      serviceCategoryCount: s2ServiceCategoryCount,
    },
    {
      id: 'section3',
      title: 'Проверено — готово к оформлению',
      products: s3Products,
      components: s3Components,
      orderServiceGroups: s3ServiceGroups,
      productTotal: sumItems(s3Products, s3Components),
      serviceTotal: s3ServiceTotal,
      total: sumItems(s3Products, s3Components) + s3ServiceTotal,
      itemCount: s3ProductCount + s3ServiceCategoryCount,
      productCount: s3ProductCount,
      serviceCategoryCount: s3ServiceCategoryCount,
    },
  ];
}
