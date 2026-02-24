'use client';

import { TrashIcon, TruckIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';
import {
  type CalculateDeliveryResult,
  type DeliveryAddressForm,
  type DeliverySettlementOption,
  type DeliveryType,
  type SubmitFromCartFullPayload,
  type UserOrder,
  addCartItemToOrder,
  calculateDelivery,
  cancelOrderByCustomer,
  formatApprovalCountdown,
  getApprovalRemainingMs,
  getDeliverySettlements,
  getUserOrders,
  submitOrderFromCart,
} from '@/shared/api/user-orders';
import { useApprovedOrderGuard } from '@/shared/lib/contexts/ApprovedOrderGuardContext';
import { useCart } from '@/shared/lib/hooks';

import styles from './page.module.css';

export default function CartPage() {
  const {
    cart,
    count,
    refreshCart,
    updateQuantity,
    updateCartItemQuantityById,
    updateComponentQuantity,
    removeFromCart,
    removeCartItemById,
    removeComponentFromCart,
    getTotalPrice,
  } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [userOrders, setUserOrders] = useState<UserOrder[] | null>(null);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);
  const [addToOrderInProgress, setAddToOrderInProgress] = useState<Set<string>>(new Set());
  const [, setTick] = useState(0);
  const guard = useApprovedOrderGuard();
  const [wantDelivery, setWantDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<{
    street: string;
    city: string;
    distanceKm: string;
    deliveryType: DeliveryType;
    deliveryFloor: string;
    deliveryHasElevator: boolean;
    preferredDeliveryTime: string;
  }>({
    street: '',
    city: '',
    distanceKm: '',
    deliveryType: 'TO_ENTRANCE',
    deliveryFloor: '',
    deliveryHasElevator: false,
    preferredDeliveryTime: '',
  });
  const [calculatedDelivery, setCalculatedDelivery] = useState<CalculateDeliveryResult | null>(
    null
  );
  const [deliveryCalculationLoading, setDeliveryCalculationLoading] = useState(false);
  const [deliveryCalculationError, setDeliveryCalculationError] = useState<string | null>(null);
  const [deliverySettlements, setDeliverySettlements] = useState<DeliverySettlementOption[]>([]);
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState<'WITH_ORDER' | 'ON_SITE'>(
    'WITH_ORDER'
  );
  /** Id позиций корзины, для которых пользователь закрыл блок «Рекомендации менеджера». */
  const [dismissedManagerCommentIds, setDismissedManagerCommentIds] = useState<Set<string>>(
    new Set()
  );
  /** Показать модалку подтверждения добавления новых товаров к проверенному заказу. */
  const [showAddToApprovedModal, setShowAddToApprovedModal] = useState(false);
  /** Показать модалку объединения с заказом на проверке. */
  const [showAddToPendingReviewModal, setShowAddToPendingReviewModal] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    getDeliverySettlements()
      .then((data) => {
        setDeliverySettlements(data.settlements ?? []);
        setDeliveryPaymentMode(data.deliveryPaymentMode ?? 'WITH_ORDER');
      })
      .catch(() => setDeliverySettlements([]));
  }, []);

  useEffect(() => {
    const loadCart = async () => {
      try {
        setLoading(true);
        setError(null);
        await refreshCart();
      } catch (err) {
        if (err instanceof Error) {
          if (err.message === 'Необходима авторизация') {
            setError('Войдите в систему, чтобы просмотреть корзину');
          } else {
            setError(err.message);
          }
        } else {
          setError('Произошла ошибка при загрузке корзины');
        }
      } finally {
        setLoading(false);
      }
    };

    loadCart();
  }, [refreshCart]);

  useEffect(() => {
    if (cart.length === 0) return;
    const loadOrders = async () => {
      try {
        const orders = await getUserOrders();
        setUserOrders(orders);
      } catch {
        setUserOrders([]);
      }
    };
    loadOrders();
  }, [cart.length]);

  const sortedOrders = useMemo(() => {
    if (!userOrders?.length) return [];
    return [...userOrders].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [userOrders]);
  const pendingReviewOrder = sortedOrders.find((o) => o.status === 'PENDING_REVIEW') ?? null;
  const approvedOrder = sortedOrders.find((o) => o.status === 'APPROVED') ?? null;
  /** Заказ, отправленный менеджером на доработку — один активный заказ на пользователя. */
  const returnedForCorrectionOrder =
    sortedOrders.find((o) => o.status === 'RETURNED_FOR_CORRECTION') ?? null;
  const approvalRemainingMs = approvedOrder
    ? getApprovalRemainingMs(approvedOrder.approvedAt ?? null)
    : 0;
  const approvalExpired = approvedOrder && approvalRemainingMs <= 0;

  /** Есть ли у заказа на проверке доставка (адрес или тип) — показываем блок доставки заполненным и с бейджем. */
  const pendingOrderHasDelivery =
    !!pendingReviewOrder &&
    (!!pendingReviewOrder.shippingAddress || !!pendingReviewOrder.deliveryType);

  /** Есть ли у проверенного заказа доставка — блок доставки остаётся заполненным и с бейджем «Проверено». */
  const approvedOrderHasDelivery =
    !!approvedOrder &&
    !approvalExpired &&
    (!!approvedOrder.shippingAddress || !!approvedOrder.deliveryType);

  /** Заказ, из которого подставляем доставку (на проверке → проверенный → на доработке). */
  const returnedOrderHasDelivery =
    !!returnedForCorrectionOrder &&
    (!!returnedForCorrectionOrder.shippingAddress || !!returnedForCorrectionOrder.deliveryType);
  const orderWithDelivery =
    pendingReviewOrder?.id && pendingOrderHasDelivery
      ? pendingReviewOrder
      : approvedOrderHasDelivery
        ? approvedOrder!
        : returnedOrderHasDelivery
          ? returnedForCorrectionOrder!
          : null;

  useEffect(() => {
    if (approvalExpired && userOrders) {
      getUserOrders().then(setUserOrders);
    }
  }, [approvalExpired]);

  /** Синхронизация формы доставки из заказа (на проверке или проверенного): не обнулять, показывать заполненным. */
  useEffect(() => {
    if (!orderWithDelivery) return;
    setWantDelivery(true);
    const addr = orderWithDelivery.shippingAddress;
    setDeliveryForm((f) => ({
      ...f,
      street: addr?.street ?? '',
      city: addr?.city ?? '',
      deliveryType:
        orderWithDelivery.deliveryType === 'TO_APARTMENT' ? 'TO_APARTMENT' : 'TO_ENTRANCE',
      deliveryFloor:
        orderWithDelivery.deliveryFloor != null ? String(orderWithDelivery.deliveryFloor) : '',
      deliveryHasElevator: orderWithDelivery.deliveryHasElevator ?? false,
      preferredDeliveryTime: orderWithDelivery.preferredDeliveryTime ?? '',
    }));
    // Не подставляем данные заказа в calculatedDelivery — расчёт и блок «Итого» всегда берут актуальную стоимость из API (текущий конфиг доставки).
  }, [orderWithDelivery?.id, !!orderWithDelivery]);

  /** ID позиций корзины, которые в заказе на проверке или на доработке (секция 2).
   * Сопоставляем по order → cart: для каждого order item выбираем один подходящий cart item
   * с минимальным id, чтобы при дубликатах (одинаковый товар добавлен дважды) в секции 2
   * попадали именно первые экземпляры, а дополнительные — в секцию 1. */
  const cartItemIdsInReviewOrder = useMemo(() => {
    const order = pendingReviewOrder ?? returnedForCorrectionOrder ?? null;
    if (!order?.items?.length || !cart.length) return new Set<string>();
    const ids = new Set<string>();
    const usedCartIds = new Set<string>();
    for (const o of order.items) {
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
  }, [pendingReviewOrder, returnedForCorrectionOrder, cart]);

  /** Алиас для совместимости. */
  const cartItemIdsInOrder = cartItemIdsInReviewOrder;

  /** ID позиций корзины, которые в заказе со статусом «Проверен» (секция 3).
   * Сопоставление order → cart с выбором cart item с минимальным id при дубликатах. */
  const cartItemIdsInApprovedOrder = useMemo(() => {
    if (!approvedOrder?.items?.length || !cart.length) return new Set<string>();
    const ids = new Set<string>();
    const usedCartIds = new Set<string>();
    for (const o of approvedOrder.items) {
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
  }, [approvedOrder, cart]);

  /** ID позиций для секции 1: ещё не отправлены на проверку. */
  const section1ItemIds = useMemo(
    () =>
      new Set(
        cart
          .filter(
            (item) =>
              !cartItemIdsInReviewOrder.has(item.id) && !cartItemIdsInApprovedOrder.has(item.id)
          )
          .map((item) => item.id)
      ),
    [cart, cartItemIdsInReviewOrder, cartItemIdsInApprovedOrder]
  );

  /** ID позиций для секции 2: в заказе на проверке или на доработке. */
  const section2ItemIds = cartItemIdsInReviewOrder;

  /** ID позиций для секции 3: в проверенном заказе. */
  const section3ItemIds = cartItemIdsInApprovedOrder;

  /** Секции корзины для отображения (1: не отправлены, 2: на проверке, 3: проверено). */
  const cartSections = useMemo(() => {
    type ProductItem = CartItem & { product: NonNullable<CartItem['product']> };
    type ComponentItem = CartItem & { component: NonNullable<CartItem['component']> };
    const sumItems = (products: ProductItem[], components: ComponentItem[]) => {
      let total = 0;
      for (const p of products) {
        const q = Math.max(1, Math.round(Number(p.quantity)));
        total += (p.product?.price ?? 0) * q;
      }
      for (const c of components) {
        const q = Math.max(0.5, Number(c.quantity));
        total += (c.component?.price ?? 0) * q;
      }
      return total;
    };
    const countItems = (products: ProductItem[], components: ComponentItem[]) => {
      let n = 0;
      for (const p of products) n += Math.max(1, Math.round(Number(p.quantity)));
      for (const c of components) n += Math.max(0.5, Number(c.quantity));
      return n;
    };
    const s1Products: ProductItem[] = [];
    const s1Components: ComponentItem[] = [];
    const s2Products: ProductItem[] = [];
    const s2Components: ComponentItem[] = [];
    const s3Products: ProductItem[] = [];
    const s3Components: ComponentItem[] = [];
    for (const item of cart) {
      if (item.product != null && item.componentId === null) {
        const p = item as ProductItem;
        if (section1ItemIds.has(item.id)) s1Products.push(p);
        else if (section2ItemIds.has(item.id)) s2Products.push(p);
        else if (section3ItemIds.has(item.id)) s3Products.push(p);
      } else if (item.component != null && item.productId === null) {
        const c = item as ComponentItem;
        if (section1ItemIds.has(item.id)) s1Components.push(c);
        else if (section2ItemIds.has(item.id)) s2Components.push(c);
        else if (section3ItemIds.has(item.id)) s3Components.push(c);
      }
    }
    return [
      {
        id: 'section1' as const,
        title: 'Товары для отправки на проверку',
        products: s1Products,
        components: s1Components,
        total: sumItems(s1Products, s1Components),
        itemCount: countItems(s1Products, s1Components),
      },
      {
        id: 'section2' as const,
        title: 'На проверке у менеджера',
        products: s2Products,
        components: s2Components,
        total: sumItems(s2Products, s2Components),
        itemCount: countItems(s2Products, s2Components),
      },
      {
        id: 'section3' as const,
        title: 'Проверено — готово к оформлению',
        products: s3Products,
        components: s3Components,
        total: sumItems(s3Products, s3Components),
        itemCount: countItems(s3Products, s3Components),
      },
    ];
  }, [cart, section1ItemIds, section2ItemIds, section3ItemIds]);

  /** Комментарий менеджера по позиции заказа — показываем на карточке товара в корзине (по совпадению productId, size, openingSide). Учитываем заказ на проверке, проверенный и на доработке. */
  const managerCommentByCartItemId = useMemo(() => {
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
  }, [approvedOrder, pendingReviewOrder, returnedForCorrectionOrder, cart]);

  const handleAddToOrder = async (cartItemId: string) => {
    if (!pendingReviewOrder) return;
    setAddToOrderInProgress((prev) => new Set(prev).add(cartItemId));
    try {
      await addCartItemToOrder(pendingReviewOrder.id, cartItemId);
      await refreshCart();
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось добавить товар в заказ');
    } finally {
      setAddToOrderInProgress((prev) => {
        const next = new Set(prev);
        next.delete(cartItemId);
        return next;
      });
    }
  };

  const buildDeliveryPayload = (): {
    deliveryAddress: DeliveryAddressForm;
    deliveryType: DeliveryType;
    deliveryFloor?: number;
    deliveryHasElevator?: boolean;
    distanceKm?: number;
    preferredDeliveryTime?: string;
  } | null => {
    if (!wantDelivery || !deliveryFormValid || !calculatedDelivery) return null;
    const payload = {
      deliveryAddress: {
        street: deliveryForm.street.trim(),
        city: deliveryForm.city.trim(),
      },
      deliveryType: deliveryForm.deliveryType,
    } as {
      deliveryAddress: DeliveryAddressForm;
      deliveryType: DeliveryType;
      deliveryFloor?: number;
      deliveryHasElevator?: boolean;
      distanceKm?: number;
      preferredDeliveryTime?: string;
    };
    if (deliveryForm.deliveryType === 'TO_APARTMENT') {
      const floor = parseInt(deliveryForm.deliveryFloor, 10);
      if (!isNaN(floor) && floor >= 1) {
        payload.deliveryFloor = floor;
        payload.deliveryHasElevator = deliveryForm.deliveryHasElevator;
      }
    }
    if (deliveryForm.preferredDeliveryTime.trim()) {
      payload.preferredDeliveryTime = deliveryForm.preferredDeliveryTime.trim();
    }
    const dist = parseFloat(deliveryForm.distanceKm);
    if (deliveryForm.distanceKm.trim() !== '' && !isNaN(dist) && dist >= 0) {
      payload.distanceKm = dist;
    }
    return payload;
  };

  const canSubmitForReview = returnedForCorrectionOrder
    ? section2ItemIds.size > 0
    : section1ItemIds.size > 0;

  const needsAddToApprovedConfirm =
    !!approvedOrder &&
    approvalRemainingMs > 0 &&
    section1ItemIds.size > 0 &&
    !returnedForCorrectionOrder;

  const needsAddToPendingReviewConfirm =
    !!pendingReviewOrder &&
    section1ItemIds.size > 0 &&
    !returnedForCorrectionOrder &&
    !needsAddToApprovedConfirm;

  const doSubmitForReview = async (options?: {
    addToApproved?: boolean;
    addToPendingReview?: boolean;
  }) => {
    setSubmitInProgress(true);
    try {
      const payload = buildDeliveryPayload();
      const cartItemIdsToSubmit =
        returnedForCorrectionOrder != null
          ? [...Array.from(section1ItemIds), ...Array.from(section2ItemIds)]
          : Array.from(section1ItemIds);
      const basePayload =
        payload != null
          ? { ...payload, cartItemIds: cartItemIdsToSubmit }
          : { cartItemIds: cartItemIdsToSubmit };
      let fullPayload: SubmitFromCartFullPayload = basePayload;
      if (options?.addToApproved === true) fullPayload = { ...fullPayload, addToApproved: true };
      if (options?.addToPendingReview === true)
        fullPayload = { ...fullPayload, addToPendingReview: true };
      const returnedOrder = await submitOrderFromCart(fullPayload);
      setShowAddToApprovedModal(false);
      setShowAddToPendingReviewModal(false);
      setUserOrders((prev) => {
        const list = prev ?? [];
        const idx = list.findIndex((o) => o.id === returnedOrder.id);
        if (idx >= 0) {
          const next = [...list];
          next[idx] = { ...next[idx], ...returnedOrder };
          return next;
        }
        return [returnedOrder, ...list];
      });
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отправить заказ на проверку');
    } finally {
      setSubmitInProgress(false);
    }
  };

  const handleSubmitForReview = () => {
    if (needsAddToApprovedConfirm) {
      setShowAddToApprovedModal(true);
      return;
    }
    if (needsAddToPendingReviewConfirm) {
      setShowAddToPendingReviewModal(true);
      return;
    }
    doSubmitForReview();
  };

  const handleDeliveryCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked;
    if (!checked) {
      setWantDelivery(false);
      return;
    }
    setWantDelivery(true);
  };

  const orderToCancel = pendingReviewOrder ?? returnedForCorrectionOrder;
  const handleCancelReview = async () => {
    if (!orderToCancel) return;
    setCancelInProgress(true);
    try {
      await cancelOrderByCustomer(orderToCancel.id);
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отменить заказ');
    } finally {
      setCancelInProgress(false);
    }
  };

  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    // Если количество становится 0 или меньше, удаляем товар из корзины
    if (newQuantity < 1) {
      await handleRemoveItem(itemId);
      return;
    }

    const itemKey = `item-${itemId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateCartItemQuantityById(itemId, newQuantity);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при обновлении количества');
      }
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleComponentQuantityChange = async (componentId: string, newQuantity: number) => {
    // Если количество становится 0 или меньше, удаляем комплектующее из корзины
    if (newQuantity <= 0) {
      await handleRemoveComponent(componentId);
      return;
    }

    const itemKey = `component-${componentId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateComponentQuantity(componentId, newQuantity);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при обновлении количества');
      }
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    const item = cart.find((c) => c.id === itemId);
    const needConfirm = item
      ? guard.hasApprovedOrder && guard.isCartItemInApprovedOrder(item)
      : false;
    const ok = await guard.confirmBeforeCartChange(async () => {
      const itemKey = `item-${itemId}`;
      setUpdatingItems((prev) => new Set(prev).add(itemKey));
      try {
        await removeCartItemById(itemId);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
        else alert('Произошла ошибка при удалении товара');
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }
    }, needConfirm);
    if (!ok && needConfirm) return;
  };

  const handleRemoveComponent = async (componentId: string) => {
    const item = cart.find((c) => c.componentId === componentId);
    const needConfirm = item
      ? guard.hasApprovedOrder && guard.isCartItemInApprovedOrder(item)
      : false;
    const ok = await guard.confirmBeforeCartChange(async () => {
      const itemKey = `component-${componentId}`;
      setUpdatingItems((prev) => new Set(prev).add(itemKey));
      try {
        await removeComponentFromCart(componentId);
      } catch (err) {
        if (err instanceof Error) alert(err.message);
        else alert('Произошла ошибка при удалении комплектующего');
      } finally {
        setUpdatingItems((prev) => {
          const next = new Set(prev);
          next.delete(itemKey);
          return next;
        });
      }
    }, needConfirm);
    if (!ok && needConfirm) return;
  };

  const totalPrice = getTotalPrice();
  const totalItems = cart.reduce((sum, item) => {
    if (item.product || item.component) {
      return sum + item.quantity;
    }
    return sum;
  }, 0);

  /** Достаточно для расчёта стоимости — город и улица. Этаж не обязателен. */
  const deliveryFormValidForCalculation =
    wantDelivery &&
    deliveryForm.street.trim() !== '' &&
    deliveryForm.city.trim() !== '' &&
    deliveryForm.city !== '__OTHER__';

  /** Достаточно для отправки заказа — для TO_APARTMENT нужен этаж. */
  const deliveryFormValid =
    deliveryFormValidForCalculation &&
    (deliveryForm.deliveryType === 'TO_ENTRANCE' ||
      (deliveryForm.deliveryType === 'TO_APARTMENT' &&
        deliveryForm.deliveryFloor.trim() !== '' &&
        parseInt(deliveryForm.deliveryFloor, 10) >= 1));

  useEffect(() => {
    if (!wantDelivery || !deliveryFormValidForCalculation) {
      setCalculatedDelivery(null);
      setDeliveryCalculationError(null);
      return;
    }
    const floorNum =
      deliveryForm.deliveryType === 'TO_APARTMENT' && deliveryForm.deliveryFloor.trim() !== ''
        ? parseInt(deliveryForm.deliveryFloor, 10)
        : undefined;
    const distanceKmNum =
      deliveryForm.distanceKm.trim() !== '' ? parseFloat(deliveryForm.distanceKm) : undefined;
    let cancelled = false;
    setDeliveryCalculationLoading(true);
    setDeliveryCalculationError(null);
    calculateDelivery({
      subtotal: totalPrice,
      city: deliveryForm.city.trim(),
      distanceKm: distanceKmNum != null && !isNaN(distanceKmNum) ? distanceKmNum : undefined,
      deliveryType: deliveryForm.deliveryType,
      deliveryFloor: floorNum,
      deliveryHasElevator:
        deliveryForm.deliveryType === 'TO_APARTMENT' ? deliveryForm.deliveryHasElevator : undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setCalculatedDelivery(res);
          setDeliveryCalculationError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCalculatedDelivery(null);
          setDeliveryCalculationError(
            err instanceof Error ? err.message : 'Не удалось рассчитать доставку'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDeliveryCalculationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    wantDelivery,
    deliveryFormValidForCalculation,
    totalPrice,
    deliveryForm.city,
    deliveryForm.distanceKm,
    deliveryForm.deliveryType,
    deliveryForm.deliveryFloor,
    deliveryForm.deliveryHasElevator,
  ]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка корзины...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Ошибка</h1>
          <p>{error}</p>
          <Link href="/" className={styles.link}>
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Корзина</h1>
        {count > 0 && (
          <p className={styles.subtitle}>
            {totalItems} {totalItems === 1 ? 'товар' : totalItems < 5 ? 'товара' : 'товаров'} на
            сумму {totalPrice.toLocaleString()} ₽
          </p>
        )}
      </div>

      {cart.length === 0 ? (
        <div className={styles.empty}>
          <h2>Ваша корзина пуста</h2>
          <p>Добавьте товары в корзину, чтобы оформить заказ</p>
          <Link href="/catalog/products" className={styles.link}>
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <div className={styles.content}>
          <div className={styles.cartItems}>
            {cartSections.map(
              (section) =>
                (section.products.length > 0 ||
                  section.components.length > 0 ||
                  (section.id === 'section1' &&
                    returnedForCorrectionOrder &&
                    canSubmitForReview)) && (
                  <div key={section.id} className={styles.cartSection}>
                    <h3 className={styles.cartSectionTitle}>{section.title}</h3>
                    <div className={styles.cartSectionItems}>
                      {section.products.map((item) => {
                        const itemKey = `item-${item.id}`;
                        const isUpdating = updatingItems.has(itemKey);
                        // Убеждаемся, что quantity - это число, и оно больше 0
                        let quantity: number;
                        if (typeof item.quantity === 'number') {
                          quantity = item.quantity;
                        } else if (typeof item.quantity === 'string') {
                          quantity = parseInt(item.quantity, 10);
                        } else {
                          quantity = 1;
                        }
                        // Гарантируем, что quantity >= 1
                        if (isNaN(quantity) || quantity < 1) {
                          quantity = 1;
                        }
                        const itemTotal = item.product.price * quantity;
                        const managerComment = managerCommentByCartItemId.get(item.id);

                        return (
                          <div key={item.id} className={styles.cartItem}>
                            <Link
                              href={`/product/${item.product.slug}`}
                              className={styles.itemImage}
                            >
                              <Image
                                src={
                                  item.product.images?.[0] ||
                                  '/images/products/door-placeholder.jpg'
                                }
                                alt={item.product.name}
                                width={88}
                                height={88}
                                className={styles.image}
                              />
                            </Link>

                            <div className={styles.itemInfo}>
                              <Link
                                href={`/product/${item.product.slug}`}
                                className={styles.itemName}
                              >
                                {item.product.name}
                              </Link>
                              <p className={styles.itemCategory}>{item.product.category.name}</p>
                              <p className={styles.itemPrice}>
                                {item.product.price.toLocaleString()} ₽ за шт.
                              </p>
                              {(item.size ||
                                item.openingSide ||
                                (item.product.stock !== undefined && item.product.stock === 0)) && (
                                <div className={styles.itemOptionsRow}>
                                  {(item.size || item.openingSide) && (
                                    <div className={styles.itemOptions}>
                                      {item.size && (
                                        <span className={styles.itemOption}>
                                          Размер: {item.size}
                                        </span>
                                      )}
                                      {item.openingSide && (
                                        <span className={styles.itemOption}>
                                          Сторона открывания: {item.openingSide}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                  {item.product.stock !== undefined && item.product.stock === 0 && (
                                    <span className={styles.outOfStockBadge}>Под заказ</span>
                                  )}
                                </div>
                              )}
                              {managerComment && !dismissedManagerCommentIds.has(item.id) && (
                                <div className={styles.itemManagerComment}>
                                  <button
                                    type="button"
                                    className={styles.itemManagerCommentClose}
                                    onClick={() =>
                                      setDismissedManagerCommentIds((prev) =>
                                        new Set(prev).add(item.id)
                                      )
                                    }
                                    aria-label="Закрыть рекомендации менеджера"
                                    title="Закрыть"
                                  >
                                    <XMarkIcon className={styles.itemManagerCommentCloseIcon} />
                                  </button>
                                  <span className={styles.itemManagerCommentLabel}>
                                    Рекомендации менеджера:
                                  </span>
                                  <span className={styles.itemManagerCommentText}>
                                    {managerComment}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className={styles.itemQuantityAndTotal}>
                              <div className={styles.itemQuantity}>
                                <button
                                  type="button"
                                  className={styles.quantityButton}
                                  onClick={() => handleQuantityChange(item.id, quantity - 1)}
                                  disabled={isUpdating}
                                  aria-label="Уменьшить количество"
                                >
                                  −
                                </button>
                                <span className={styles.quantityValue}>{quantity}</span>
                                <button
                                  type="button"
                                  className={styles.quantityButton}
                                  onClick={() => handleQuantityChange(item.id, quantity + 1)}
                                  disabled={isUpdating}
                                  aria-label="Увеличить количество"
                                >
                                  +
                                </button>
                              </div>
                              <span className={styles.totalPrice}>
                                {itemTotal.toLocaleString()} ₽
                              </span>
                            </div>

                            <div className={styles.itemActionsColumn}>
                              {cartItemIdsInApprovedOrder.has(item.id) ? (
                                <span
                                  className={styles.itemInOrderBadge}
                                  title="Проверено"
                                  aria-hidden
                                >
                                  <svg
                                    className={styles.doubleCheckIcon}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12l3 3 7-7" />
                                    <path d="M9 15l2 2 5-5" />
                                  </svg>
                                </span>
                              ) : cartItemIdsInOrder.has(item.id) ? (
                                <span
                                  className={styles.itemInOrderBadge}
                                  title="В заказе на проверке"
                                  aria-hidden
                                >
                                  <svg
                                    className={styles.reviewProgressIconSmall}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <g className={styles.reviewProgressSpinnerArc}>
                                      <path
                                        strokeDasharray="28 56"
                                        d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"
                                      />
                                    </g>
                                    <path
                                      className={styles.reviewProgressCheck}
                                      d="M7 12l3.5 3.5L17 9"
                                    />
                                  </svg>
                                </span>
                              ) : pendingReviewOrder && section.id !== 'section1' ? (
                                <button
                                  type="button"
                                  className={styles.addToOrderButton}
                                  onClick={() => handleAddToOrder(item.id)}
                                  disabled={addToOrderInProgress.has(item.id)}
                                  aria-label="Проверить"
                                >
                                  {addToOrderInProgress.has(item.id) ? '…' : 'Проверить'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => handleRemoveItem(item.id)}
                                disabled={isUpdating || cartItemIdsInOrder.has(item.id)}
                                title={
                                  cartItemIdsInApprovedOrder.has(item.id)
                                    ? 'Удалить (заказ будет переоформлен)'
                                    : cartItemIdsInOrder.has(item.id)
                                      ? 'Нельзя удалить: товар в заказе на проверке'
                                      : 'Удалить товар'
                                }
                                aria-label="Удалить товар"
                              >
                                <TrashIcon className={styles.removeButtonIcon} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      {section.components.map((item) => {
                        const itemKey = `component-${item.componentId}`;
                        const isUpdating = updatingItems.has(itemKey);
                        // quantity может быть дробным (например, 2,5 для «Стойка коробки»)
                        let quantity: number;
                        if (typeof item.quantity === 'number') {
                          quantity = item.quantity;
                        } else if (typeof item.quantity === 'string') {
                          quantity = parseFloat(item.quantity);
                        } else {
                          quantity = 1;
                        }
                        if (isNaN(quantity) || quantity <= 0) {
                          quantity = 1;
                        }
                        // «Стойка коробки» — шаг 0,5, минимум 0,5; остальные — шаг 1, минимум 1
                        const isStoikaKorobka =
                          /стойка\s+коробки/i.test(item.component.name) ||
                          /стойка\s+коробки/i.test(item.component.type) ||
                          (item.component.name === 'Коробка' &&
                            !/стойки/i.test(item.component.type ?? ''));
                        const step = isStoikaKorobka ? 0.5 : 1;
                        const minQty = isStoikaKorobka ? 0.5 : 1;
                        const displayQty =
                          step === 0.5 && quantity % 1 !== 0
                            ? quantity.toFixed(1)
                            : String(quantity);
                        const newQtyDown = Math.round((quantity - step) * 2) / 2;
                        const newQtyUp = Math.round((quantity + step) * 2) / 2;

                        const itemTotal = item.component.price * quantity;

                        return (
                          <div key={item.id} className={styles.cartItem}>
                            <Link
                              href={`/product/${item.component.product.slug}`}
                              className={styles.itemImage}
                            >
                              <Image
                                src={
                                  item.component.image || '/images/products/door-placeholder.jpg'
                                }
                                alt={item.component.name}
                                width={88}
                                height={88}
                                className={styles.image}
                              />
                            </Link>

                            <div className={styles.itemInfo}>
                              <Link
                                href={`/product/${item.component.product.slug}`}
                                className={styles.itemName}
                              >
                                {item.component.name}
                              </Link>
                              <p className={styles.itemCategory}>
                                {item.component.type} • {item.component.product.name}
                              </p>
                              <p className={styles.itemPrice}>
                                {item.component.price.toLocaleString()} ₽ за шт.
                              </p>
                            </div>

                            <div className={styles.itemQuantityAndTotal}>
                              <div className={styles.itemQuantity}>
                                <button
                                  type="button"
                                  className={styles.quantityButton}
                                  onClick={async () => {
                                    if (newQtyDown < minQty) {
                                      await handleRemoveComponent(item.componentId!);
                                    } else {
                                      await handleComponentQuantityChange(
                                        item.componentId!,
                                        newQtyDown
                                      );
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
                                  onClick={() =>
                                    handleComponentQuantityChange(item.componentId!, newQtyUp)
                                  }
                                  disabled={isUpdating}
                                  aria-label="Увеличить количество"
                                >
                                  +
                                </button>
                              </div>
                              <span className={styles.totalPrice}>
                                {itemTotal.toLocaleString()} ₽
                              </span>
                            </div>

                            <div className={styles.itemActionsColumn}>
                              {cartItemIdsInApprovedOrder.has(item.id) ? (
                                <span
                                  className={styles.itemInOrderBadge}
                                  title="Проверено"
                                  aria-hidden
                                >
                                  <svg
                                    className={styles.doubleCheckIcon}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12l3 3 7-7" />
                                    <path d="M9 15l2 2 5-5" />
                                  </svg>
                                </span>
                              ) : cartItemIdsInOrder.has(item.id) ? (
                                <span
                                  className={styles.itemInOrderBadge}
                                  title="В заказе на проверке"
                                  aria-hidden
                                >
                                  <svg
                                    className={styles.reviewProgressIconSmall}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <g className={styles.reviewProgressSpinnerArc}>
                                      <path
                                        strokeDasharray="28 56"
                                        d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"
                                      />
                                    </g>
                                    <path
                                      className={styles.reviewProgressCheck}
                                      d="M7 12l3.5 3.5L17 9"
                                    />
                                  </svg>
                                </span>
                              ) : pendingReviewOrder && section.id !== 'section1' ? (
                                <button
                                  type="button"
                                  className={styles.addToOrderButton}
                                  onClick={() => handleAddToOrder(item.id)}
                                  disabled={addToOrderInProgress.has(item.id)}
                                  aria-label="Проверить"
                                >
                                  {addToOrderInProgress.has(item.id) ? '…' : 'Проверить'}
                                </button>
                              ) : null}
                              <button
                                type="button"
                                className={styles.removeButton}
                                onClick={() => handleRemoveComponent(item.componentId!)}
                                disabled={isUpdating || cartItemIdsInOrder.has(item.id)}
                                title={
                                  cartItemIdsInApprovedOrder.has(item.id)
                                    ? 'Удалить (заказ будет переоформлен)'
                                    : cartItemIdsInOrder.has(item.id)
                                      ? 'Нельзя удалить: товар в заказе на проверке'
                                      : 'Удалить комплектующее'
                                }
                                aria-label="Удалить комплектующее"
                              >
                                <TrashIcon className={styles.removeButtonIcon} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {section.id === 'section1' && !orderWithDelivery && (
                      <div className={styles.deliveryCheckboxWrap}>
                        <label className={styles.deliveryCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={wantDelivery}
                            onChange={handleDeliveryCheckboxChange}
                            className={styles.deliveryCheckbox}
                          />
                          <span>Оформить доставку</span>
                        </label>
                        <p className={styles.deliveryCheckboxHint}>
                          Заполните адрес и условия доставки — они отправятся на проверку вместе с
                          заказом по кнопке «Отправить на проверку».
                        </p>
                      </div>
                    )}

                    {section.id === 'section1' && wantDelivery && !orderWithDelivery && (
                      <div className={styles.deliveryFormBlock}>
                        <div className={styles.deliveryFormTitleRow}>
                          <h3 className={styles.deliveryFormTitle}>Адрес и условия доставки</h3>
                          {deliveryPaymentMode === 'ON_SITE' && (
                            <p className={styles.deliveryFormPaymentNote}>
                              Оплата доставки не включается в стоимость заказа, а производится
                              водителю после доставки товара.
                            </p>
                          )}
                        </div>
                        <div className={styles.deliveryFormGrid}>
                          <div className={styles.deliveryFormField}>
                            <label htmlFor={`delivery-street-${section.id}`}>
                              Улица, дом, квартира *
                            </label>
                            <input
                              id={`delivery-street-${section.id}`}
                              type="text"
                              value={deliveryForm.street}
                              onChange={(e) =>
                                setDeliveryForm((f) => ({ ...f, street: e.target.value }))
                              }
                              placeholder="ул. Примерная, д. 1, кв. 1"
                            />
                          </div>
                          <div className={styles.deliveryFormField}>
                            <label htmlFor={`delivery-city-${section.id}`}>Город *</label>
                            {deliverySettlements.length > 0 ? (
                              <>
                                <select
                                  id={`delivery-city-${section.id}`}
                                  value={
                                    deliveryForm.city === '__OTHER__' ||
                                    (deliveryForm.city.trim() !== '' &&
                                      !deliverySettlements.some(
                                        (s) =>
                                          s.name.trim().toLowerCase() ===
                                          deliveryForm.city.trim().toLowerCase()
                                      ))
                                      ? '__OTHER__'
                                      : deliverySettlements.some(
                                            (s) =>
                                              s.name.trim().toLowerCase() ===
                                              deliveryForm.city.trim().toLowerCase()
                                          )
                                        ? deliveryForm.city.trim()
                                        : '__SELECT__'
                                  }
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '__SELECT__') {
                                      setDeliveryForm((f) => ({ ...f, city: '', distanceKm: '' }));
                                    } else if (v === '__OTHER__') {
                                      setDeliveryForm((f) => ({
                                        ...f,
                                        city: '__OTHER__',
                                        distanceKm: f.distanceKm,
                                      }));
                                    } else {
                                      setDeliveryForm((f) => ({ ...f, city: v, distanceKm: '' }));
                                    }
                                  }}
                                >
                                  <option value="__SELECT__">Выберите город</option>
                                  {deliverySettlements.map((s) => (
                                    <option key={s.name} value={s.name}>
                                      {s.name} — {s.price.toLocaleString()} ₽
                                    </option>
                                  ))}
                                  <option value="__OTHER__">Другой населённый пункт</option>
                                </select>
                                {(deliveryForm.city === '__OTHER__' ||
                                  (deliveryForm.city.trim() !== '' &&
                                    !deliverySettlements.some(
                                      (s) =>
                                        s.name.trim().toLowerCase() ===
                                        deliveryForm.city.trim().toLowerCase()
                                    ))) && (
                                  <input
                                    type="text"
                                    className={styles.deliveryFormOtherCity}
                                    value={
                                      deliveryForm.city === '__OTHER__' ? '' : deliveryForm.city
                                    }
                                    onChange={(e) =>
                                      setDeliveryForm((f) => ({ ...f, city: e.target.value }))
                                    }
                                    placeholder="Укажите населённый пункт"
                                  />
                                )}
                              </>
                            ) : (
                              <input
                                id={`delivery-city-${section.id}`}
                                type="text"
                                value={deliveryForm.city}
                                onChange={(e) =>
                                  setDeliveryForm((f) => ({ ...f, city: e.target.value }))
                                }
                                placeholder="Мурманск"
                              />
                            )}
                          </div>
                          {(deliverySettlements.length > 0
                            ? (deliveryForm.city === '__OTHER__' ||
                                (deliveryForm.city.trim() !== '' &&
                                  !deliverySettlements.some(
                                    (s) =>
                                      s.name.trim().toLowerCase() ===
                                      deliveryForm.city.trim().toLowerCase()
                                  ))) &&
                              deliveryForm.city !== '__OTHER__'
                            : deliveryForm.city.trim() &&
                              !deliveryForm.city.trim().toLowerCase().includes('мурманск')) && (
                            <div className={styles.deliveryFormField}>
                              <label htmlFor={`delivery-distance-${section.id}`}>
                                Расстояние от Мурманска, км
                              </label>
                              <input
                                id={`delivery-distance-${section.id}`}
                                type="number"
                                min={0}
                                step={1}
                                value={deliveryForm.distanceKm}
                                onChange={(e) =>
                                  setDeliveryForm((f) => ({ ...f, distanceKm: e.target.value }))
                                }
                                placeholder="0"
                              />
                            </div>
                          )}
                        </div>
                        <div className={styles.deliveryFormRadios}>
                          <label className={styles.deliveryRadioLabel}>
                            <input
                              type="radio"
                              name="deliveryType"
                              checked={deliveryForm.deliveryType === 'TO_ENTRANCE'}
                              onChange={() =>
                                setDeliveryForm((f) => ({ ...f, deliveryType: 'TO_ENTRANCE' }))
                              }
                            />
                            <span>Доставка до подъезда</span>
                          </label>
                          <label className={styles.deliveryRadioLabel}>
                            <input
                              type="radio"
                              name="deliveryType"
                              checked={deliveryForm.deliveryType === 'TO_APARTMENT'}
                              onChange={() =>
                                setDeliveryForm((f) => ({ ...f, deliveryType: 'TO_APARTMENT' }))
                              }
                            />
                            <span>Доставка до квартиры</span>
                          </label>
                        </div>
                        {deliveryForm.deliveryType === 'TO_APARTMENT' && (
                          <div className={styles.deliveryFormLift}>
                            <div className={styles.deliveryFormField}>
                              <label htmlFor={`delivery-floor-${section.id}`}>Этаж *</label>
                              <input
                                id={`delivery-floor-${section.id}`}
                                type="number"
                                min={1}
                                value={deliveryForm.deliveryFloor}
                                onChange={(e) =>
                                  setDeliveryForm((f) => ({ ...f, deliveryFloor: e.target.value }))
                                }
                                placeholder="1"
                              />
                            </div>
                            <label className={styles.deliveryFormCheckbox}>
                              <input
                                type="checkbox"
                                checked={deliveryForm.deliveryHasElevator}
                                onChange={(e) =>
                                  setDeliveryForm((f) => ({
                                    ...f,
                                    deliveryHasElevator: e.target.checked,
                                  }))
                                }
                              />
                              <span>Есть лифт</span>
                            </label>
                            <p className={styles.deliveryFormMoversNote}>
                              Стоимость работы одного грузчика производится из расчёта = 1000
                              руб/час.
                            </p>
                          </div>
                        )}
                        <div
                          className={`${styles.deliveryFormField} ${styles.deliveryFormDateField}`}
                        >
                          <label htmlFor={`delivery-preferred-date-${section.id}`}>
                            Выберите удобный для вас день для осуществления доставки (мы постараемся
                            организовать доставку в выбранный вами день)
                          </label>
                          <input
                            id={`delivery-preferred-date-${section.id}`}
                            type="date"
                            value={
                              /^\d{4}-\d{2}-\d{2}$/.test(deliveryForm.preferredDeliveryTime)
                                ? deliveryForm.preferredDeliveryTime
                                : ''
                            }
                            min={new Date().toISOString().slice(0, 10)}
                            onChange={(e) =>
                              setDeliveryForm((f) => ({
                                ...f,
                                preferredDeliveryTime: e.target.value,
                              }))
                            }
                          />
                        </div>
                        {deliveryFormValid && (
                          <div className={styles.deliveryFormTotal}>
                            {deliveryCalculationLoading && (
                              <div className={styles.deliveryCostLine}>
                                <span className={styles.deliveryCostLabel}>
                                  Стоимость доставки:
                                </span>
                                <span className={styles.deliveryCostLoading}>Рассчитываем…</span>
                              </div>
                            )}
                            {!deliveryCalculationLoading && deliveryCalculationError && (
                              <div className={styles.deliveryCostLine}>
                                <span className={styles.deliveryCostError}>
                                  {deliveryCalculationError}
                                </span>
                              </div>
                            )}
                            {!deliveryCalculationLoading &&
                              calculatedDelivery &&
                              !deliveryCalculationError && (
                                <div className={styles.deliveryCostLine}>
                                  <span className={styles.deliveryCostLabel}>
                                    Предварительный расчёт доставки:
                                  </span>
                                  <strong className={styles.deliveryCostValue}>
                                    {calculatedDelivery.totalShippingCost.toLocaleString()} ₽
                                  </strong>
                                </div>
                              )}
                          </div>
                        )}
                      </div>
                    )}

                    {(section.id === 'section2' &&
                      (pendingOrderHasDelivery || returnedOrderHasDelivery) &&
                      orderWithDelivery) ||
                    (section.id === 'section3' && approvedOrderHasDelivery && orderWithDelivery) ? (
                      <div className={styles.deliveryCompactWrap}>
                        <div className={styles.deliveryCompactRow}>
                          <div className={styles.deliveryCompactIcon} aria-hidden>
                            <TruckIcon className={styles.deliveryCompactIconSvg} />
                          </div>
                          <div className={styles.deliveryCompactInfo}>
                            <span className={styles.deliveryCompactTitle}>
                              Доставка
                              {deliveryPaymentMode === 'ON_SITE' && (
                                <span className={styles.deliveryPayOnSiteBadge} role="status">
                                  Оплатить водителю!
                                </span>
                              )}
                            </span>
                            <span className={styles.deliveryCompactDetails}>
                              {[
                                orderWithDelivery.shippingAddress?.street,
                                orderWithDelivery.shippingAddress?.city,
                              ]
                                .filter(Boolean)
                                .join(', ') || 'Адрес указан'}
                              {' · '}
                              {orderWithDelivery.deliveryType === 'TO_APARTMENT'
                                ? 'до квартиры'
                                : 'до подъезда'}
                              {orderWithDelivery.deliveryType === 'TO_APARTMENT' &&
                                orderWithDelivery.deliveryFloor != null &&
                                `, ${orderWithDelivery.deliveryFloor} этаж`}
                            </span>
                            {(Number(orderWithDelivery.shippingCost ?? 0) > 0 ||
                              Number(orderWithDelivery.carryCost ?? 0) > 0) && (
                              <div className={styles.deliveryCompactCostBreakdown}>
                                <div className={styles.deliveryCompactCostLine}>
                                  <span>
                                    Доставка:{' '}
                                    {(Number(orderWithDelivery.shippingCost) || 0).toLocaleString(
                                      'ru-RU'
                                    )}{' '}
                                    ₽
                                  </span>
                                  {orderWithDelivery.carryCost != null &&
                                    Number(orderWithDelivery.carryCost) > 0 && (
                                      <span>
                                        {orderWithDelivery.moversCount != null &&
                                        orderWithDelivery.moversCount > 0
                                          ? `${orderWithDelivery.moversCount} грузчик${orderWithDelivery.moversCount === 1 ? '' : orderWithDelivery.moversCount < 5 ? 'а' : 'ов'}: `
                                          : 'Грузчики: '}
                                        {Number(orderWithDelivery.carryCost).toLocaleString(
                                          'ru-RU'
                                        )}{' '}
                                        ₽
                                      </span>
                                    )}
                                </div>
                                <span className={styles.deliveryCompactCostTotal}>
                                  Итого стоимость доставки:{' '}
                                  {(
                                    Number(orderWithDelivery.shippingCost ?? 0) +
                                    Number(orderWithDelivery.carryCost ?? 0)
                                  ).toLocaleString('ru-RU')}{' '}
                                  ₽
                                </span>
                              </div>
                            )}
                            {orderWithDelivery.plannedDeliveryDate && (
                              <span className={styles.deliveryCompactDate}>
                                Дата доставки:{' '}
                                {new Date(orderWithDelivery.plannedDeliveryDate).toLocaleDateString(
                                  'ru-RU'
                                )}
                              </span>
                            )}
                          </div>
                          <div className={styles.itemActionsColumn}>
                            {orderWithDelivery.adminEditedAt && (
                              <span className={styles.deliveryEditedBadge} role="status">
                                Изменено!
                              </span>
                            )}
                            {pendingOrderHasDelivery ? (
                              <span
                                className={styles.itemInOrderBadge}
                                title="В заказе на проверке"
                                aria-hidden
                              >
                                <svg
                                  className={styles.reviewProgressIconSmall}
                                  xmlns="http://www.w3.org/2000/svg"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  strokeWidth={2}
                                  stroke="currentColor"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <g className={styles.reviewProgressSpinnerArc}>
                                    <path
                                      strokeDasharray="28 56"
                                      d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z"
                                    />
                                  </g>
                                  <path
                                    className={styles.reviewProgressCheck}
                                    d="M7 12l3.5 3.5L17 9"
                                  />
                                </svg>
                              </span>
                            ) : (
                              <>
                                <span
                                  className={styles.itemInOrderBadge}
                                  title="Проверено"
                                  aria-hidden
                                >
                                  <svg
                                    className={styles.doubleCheckIcon}
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth={2.5}
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M5 12l3 3 7-7" />
                                    <path d="M9 15l2 2 5-5" />
                                  </svg>
                                </span>
                                {approvedOrder && approvalRemainingMs > 0 && (
                                  <Link
                                    href={`/checkout?orderId=${approvedOrder.id}`}
                                    className={styles.deliveryBasketButton}
                                    title="Корзинка — перейти к оформлению"
                                    aria-label="Корзинка — перейти к оформлению"
                                  >
                                    <TrashIcon className={styles.deliveryBasketButtonIcon} />
                                  </Link>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className={styles.cartSectionSummary}>
                      <div className={styles.cartSectionSummaryRows}>
                        <div className={styles.cartSectionSummaryRow}>
                          <span className={styles.cartSectionSummaryLabel}>Товаров:</span>
                          <span>
                            {section.id === 'section1' &&
                            returnedForCorrectionOrder &&
                            section.products.length === 0 &&
                            section.components.length === 0
                              ? (cartSections[1]?.itemCount ?? 0)
                              : section.itemCount}
                          </span>
                        </div>
                        <div className={styles.cartSectionSummaryRow}>
                          <span className={styles.cartSectionSummaryLabel}>Сумма товаров:</span>
                          <span>
                            {section.id === 'section1' &&
                            returnedForCorrectionOrder &&
                            section.products.length === 0 &&
                            section.components.length === 0
                              ? (cartSections[1]?.total ?? 0).toLocaleString()
                              : section.total.toLocaleString()}{' '}
                            ₽
                          </span>
                        </div>
                        {(section.id === 'section1' &&
                          wantDelivery &&
                          !orderWithDelivery &&
                          calculatedDelivery) ||
                        (section.id === 'section2' &&
                          (pendingOrderHasDelivery || returnedOrderHasDelivery) &&
                          orderWithDelivery) ||
                        (section.id === 'section3' &&
                          approvedOrderHasDelivery &&
                          orderWithDelivery) ? (
                          <>
                            <div className={styles.cartSectionSummaryRow}>
                              <span className={styles.cartSectionSummaryLabel}>Доставка:</span>
                              <span>
                                {section.id === 'section1' && calculatedDelivery
                                  ? calculatedDelivery.totalShippingCost.toLocaleString()
                                  : orderWithDelivery
                                    ? (
                                        Number(orderWithDelivery.shippingCost ?? 0) +
                                        Number(orderWithDelivery.carryCost ?? 0)
                                      ).toLocaleString()
                                    : '0'}{' '}
                                ₽
                              </span>
                            </div>
                            {deliveryPaymentMode === 'ON_SITE' && (
                              <p className={styles.cartSectionDeliveryNote}>
                                Стоимость доставки не включена в заказ
                              </p>
                            )}
                          </>
                        ) : (
                          <div className={styles.cartSectionSummaryRow}>
                            <span className={styles.cartSectionSummaryLabel}>Доставка:</span>
                            <span>—</span>
                          </div>
                        )}
                        <div
                          className={`${styles.cartSectionSummaryRow} ${styles.cartSectionSummaryRowTotal}`}
                        >
                          <span className={styles.cartSectionTotalLabel}>Итого:</span>
                          <span className={styles.cartSectionTotal}>
                            {(() => {
                              const baseTotal =
                                section.id === 'section1' &&
                                returnedForCorrectionOrder &&
                                section.products.length === 0 &&
                                section.components.length === 0
                                  ? (cartSections[1]?.total ?? 0)
                                  : section.total;
                              const hasDelivery =
                                (section.id === 'section1' &&
                                  wantDelivery &&
                                  !orderWithDelivery &&
                                  calculatedDelivery) ||
                                (section.id === 'section2' &&
                                  (pendingOrderHasDelivery || returnedOrderHasDelivery) &&
                                  orderWithDelivery) ||
                                (section.id === 'section3' &&
                                  approvedOrderHasDelivery &&
                                  orderWithDelivery);
                              const deliveryAmount = hasDelivery
                                ? section.id === 'section1' && calculatedDelivery
                                  ? calculatedDelivery.totalShippingCost
                                  : orderWithDelivery
                                    ? Number(orderWithDelivery.shippingCost ?? 0) +
                                      Number(orderWithDelivery.carryCost ?? 0)
                                    : 0
                                : 0;
                              const total =
                                deliveryPaymentMode === 'WITH_ORDER' && hasDelivery
                                  ? baseTotal + deliveryAmount
                                  : baseTotal;
                              return `${total.toLocaleString()} ₽`;
                            })()}
                          </span>
                        </div>
                      </div>
                      {section.id === 'section1' && returnedForCorrectionOrder && (
                        <div className={styles.returnedForCorrectionBanner} role="alert">
                          <p className={styles.returnedForCorrectionTitle}>
                            Заказ {returnedForCorrectionOrder.orderNumber} отправлен на доработку
                          </p>
                          {returnedForCorrectionOrder.returnedForCorrectionComment && (
                            <p className={styles.returnedForCorrectionHint}>
                              {returnedForCorrectionOrder.returnedForCorrectionComment}
                            </p>
                          )}
                        </div>
                      )}
                      {section.id === 'section1' && canSubmitForReview && (
                        <div className={styles.cartSectionActions}>
                          <button
                            type="button"
                            className={styles.checkoutButton}
                            onClick={handleSubmitForReview}
                            disabled={submitInProgress || !canSubmitForReview}
                          >
                            {submitInProgress
                              ? 'Отправка...'
                              : returnedForCorrectionOrder
                                ? 'Отправить на проверку повторно'
                                : 'Отправить на проверку'}
                          </button>
                          {!returnedForCorrectionOrder && (
                            <p className={styles.checkoutHint}>
                              Обычно проверка длится около 15 минут
                            </p>
                          )}
                        </div>
                      )}
                      {section.id === 'section2' &&
                        (pendingReviewOrder || returnedForCorrectionOrder) && (
                          <div className={styles.cartSectionActions}>
                            {returnedForCorrectionOrder && (
                              <p className={styles.cartSectionHint}>
                                Менеджер оставил комментарии. Внесите изменения и нажмите кнопку
                                «Отправить на проверку» в блоке выше.
                              </p>
                            )}
                            {pendingReviewOrder && (
                              <p className={`${styles.checkoutHint} ${styles.checkoutHintPink}`}>
                                Обычно проверка длится около 15 минут
                              </p>
                            )}
                            <button
                              type="button"
                              className={styles.cancelReviewLink}
                              onClick={handleCancelReview}
                              disabled={cancelInProgress}
                            >
                              {cancelInProgress ? 'Отмена…' : 'Отменить проверку'}
                            </button>
                          </div>
                        )}
                      {section.id === 'section3' && approvedOrder && approvalRemainingMs > 0 && (
                        <div className={styles.cartSectionActions}>
                          <p className={styles.approvalCountdown}>
                            Оформить в течение:{' '}
                            <span className={styles.approvalCountdownTime}>
                              {formatApprovalCountdown(approvalRemainingMs)}
                            </span>
                          </p>
                          <Link
                            href={`/checkout?orderId=${approvedOrder.id}`}
                            className={styles.checkoutButton}
                          >
                            Оформить заказ
                          </Link>
                        </div>
                      )}
                      {section.id === 'section3' && approvedOrder && approvalRemainingMs <= 0 && (
                        <p className={styles.checkoutHint}>
                          Время действия заказа истекло. Обновляю…
                        </p>
                      )}
                    </div>
                  </div>
                )
            )}

            <div className={styles.continueShoppingWrap}>
              <Link href="/catalog/products" className={styles.continueShopping}>
                Продолжить покупки
              </Link>
            </div>
          </div>
        </div>
      )}

      {showAddToApprovedModal && (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-approved-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddToApprovedModal(false);
          }}
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="add-to-approved-modal-title" className={styles.confirmModalTitle}>
              Добавить товары к проверенному заказу?
            </h3>
            <p className={styles.confirmModalText}>
              У вас уже есть проверенный заказ. При отправке новых товаров на проверку они будут
              добавлены к вашему проверенному заказу, и заказ снова отправится на проверку
              менеджеру.
            </p>
            <p className={styles.confirmModalHint}>
              После проверки вы сможете оформить и оплатить весь заказ целиком.
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmModalButtonSecondary}
                onClick={() => setShowAddToApprovedModal(false)}
                disabled={submitInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmModalButtonPrimary}
                onClick={() => doSubmitForReview({ addToApproved: true })}
                disabled={submitInProgress}
              >
                {submitInProgress ? 'Отправка…' : 'Да, добавить к заказу'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddToPendingReviewModal && (
        <div
          className={styles.confirmModalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-to-pending-review-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddToPendingReviewModal(false);
          }}
        >
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <h3 id="add-to-pending-review-modal-title" className={styles.confirmModalTitle}>
              Обновить заказ на проверке?
            </h3>
            <p className={styles.confirmModalText}>
              У вас уже есть заказ на проверке. При отправке новых товаров они добавятся к этому
              заказу, и проверка запустится заново с обновлённым списком товаров.
            </p>
            <p className={styles.confirmModalHint}>
              Менеджер увидит объединённый заказ и проверит его заново.
            </p>
            <div className={styles.confirmModalActions}>
              <button
                type="button"
                className={styles.confirmModalButtonSecondary}
                onClick={() => setShowAddToPendingReviewModal(false)}
                disabled={submitInProgress}
              >
                Отмена
              </button>
              <button
                type="button"
                className={styles.confirmModalButtonPrimary}
                onClick={() => doSubmitForReview({ addToPendingReview: true })}
                disabled={submitInProgress}
              >
                {submitInProgress ? 'Отправка…' : 'Да, обновить заказ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
