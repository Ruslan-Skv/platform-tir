'use client';

import { TrashIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useMemo, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';
import {
  type UserOrder,
  cancelOrderByCustomer,
  getUserOrders,
  submitOrderFromCart,
} from '@/shared/api/user-orders';
import { useCart } from '@/shared/lib/hooks';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

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
    clearCart,
    getTotalPrice,
  } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [userOrders, setUserOrders] = useState<UserOrder[] | null>(null);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [cancelInProgress, setCancelInProgress] = useState(false);

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

  const handleSubmitForReview = async () => {
    setSubmitInProgress(true);
    try {
      await submitOrderFromCart();
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отправить заказ на проверку');
    } finally {
      setSubmitInProgress(false);
    }
  };

  const handleCancelReview = async () => {
    if (!pendingReviewOrder) return;
    setCancelInProgress(true);
    try {
      await cancelOrderByCustomer(pendingReviewOrder.id);
      const orders = await getUserOrders();
      setUserOrders(orders);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось отменить проверку');
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
    const itemKey = `item-${itemId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await removeCartItemById(itemId);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при удалении товара');
      }
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleRemoveComponent = async (componentId: string) => {
    const itemKey = `component-${componentId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await removeComponentFromCart(componentId);
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при удалении комплектующего');
      }
    } finally {
      setUpdatingItems((prev) => {
        const next = new Set(prev);
        next.delete(itemKey);
        return next;
      });
    }
  };

  const handleClearCartClick = () => {
    setIsClearModalOpen(true);
  };

  const handleClearCartConfirm = async () => {
    try {
      await clearCart();
    } catch (err) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert('Произошла ошибка при очистке корзины');
      }
    }
  };

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

  const totalPrice = getTotalPrice();
  const totalItems = cart.reduce((sum, item) => {
    if (item.product || item.component) {
      return sum + item.quantity;
    }
    return sum;
  }, 0);

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
            {/* Отображаем товары */}
            {cart
              .filter(
                (item): item is CartItem & { product: NonNullable<CartItem['product']> } =>
                  item.product !== null && item.componentId === null
              )
              .map((item) => {
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

                return (
                  <div key={item.id} className={styles.cartItem}>
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
                                <span className={styles.itemOption}>Размер: {item.size}</span>
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
                      <span className={styles.totalPrice}>{itemTotal.toLocaleString()} ₽</span>
                    </div>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={isUpdating}
                      aria-label="Удалить товар"
                    >
                      <TrashIcon className={styles.removeButtonIcon} />
                    </button>
                  </div>
                );
              })}

            {/* Отображаем комплектующие */}
            {cart
              .filter(
                (item): item is CartItem & { component: NonNullable<CartItem['component']> } =>
                  item.component !== null && item.productId === null
              )
              .map((item) => {
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
                  (item.component.name === 'Коробка' && !/стойки/i.test(item.component.type ?? ''));
                const step = isStoikaKorobka ? 0.5 : 1;
                const minQty = isStoikaKorobka ? 0.5 : 1;
                const displayQty =
                  step === 0.5 && quantity % 1 !== 0 ? quantity.toFixed(1) : String(quantity);
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
                        src={item.component.image || '/images/products/door-placeholder.jpg'}
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
                              await handleComponentQuantityChange(item.componentId!, newQtyDown);
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
                          onClick={() => handleComponentQuantityChange(item.componentId!, newQtyUp)}
                          disabled={isUpdating}
                          aria-label="Увеличить количество"
                        >
                          +
                        </button>
                      </div>
                      <span className={styles.totalPrice}>{itemTotal.toLocaleString()} ₽</span>
                    </div>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveComponent(item.componentId!)}
                      disabled={isUpdating}
                      aria-label="Удалить комплектующее"
                    >
                      <TrashIcon className={styles.removeButtonIcon} />
                    </button>
                  </div>
                );
              })}

            <div className={styles.cartActions}>
              <button type="button" className={styles.clearButton} onClick={handleClearCartClick}>
                Очистить корзину
              </button>
            </div>
          </div>

          <div className={styles.summary}>
            <div className={styles.summaryContent}>
              <h2 className={styles.summaryTitle}>Итого</h2>
              <div className={styles.summaryRow}>
                <span>Товаров:</span>
                <span>{totalItems}</span>
              </div>
              <div className={styles.summaryRow}>
                <span>Сумма:</span>
                <span className={styles.totalPrice}>{totalPrice.toLocaleString()} ₽</span>
              </div>
              {approvedOrder ? (
                <Link
                  href={`/checkout?orderId=${approvedOrder.id}`}
                  className={styles.checkoutButton}
                >
                  Оформить заказ
                </Link>
              ) : pendingReviewOrder ? (
                <>
                  <button type="button" className={styles.checkoutButton} disabled>
                    <span className={styles.checkoutButtonContent}>
                      <svg
                        className={styles.reviewProgressIcon}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={2}
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <g className={styles.reviewProgressSpinnerArc}>
                          <path strokeDasharray="28 56" d="M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z" />
                        </g>
                        <path className={styles.reviewProgressCheck} d="M7 12l3.5 3.5L17 9" />
                      </svg>
                      Заказ на проверке
                    </span>
                  </button>
                  <p className={`${styles.checkoutHint} ${styles.checkoutHintPink}`}>
                    Обычно проверка длится около 15 минут
                  </p>
                  <div className={styles.cancelReviewWrap}>
                    <button
                      type="button"
                      className={styles.cancelReviewLink}
                      onClick={handleCancelReview}
                      disabled={cancelInProgress}
                    >
                      {cancelInProgress ? 'Отмена…' : 'Отменить проверку'}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className={styles.checkoutButton}
                    onClick={handleSubmitForReview}
                    disabled={submitInProgress}
                  >
                    {submitInProgress ? 'Отправка...' : 'Отправить на проверку'}
                  </button>
                  <p className={styles.checkoutHint}>Обычно проверка длится около 15 минут</p>
                </>
              )}
              <Link href="/catalog/products" className={styles.continueShopping}>
                Продолжить покупки
              </Link>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={isClearModalOpen}
        onClose={() => setIsClearModalOpen(false)}
        onConfirm={handleClearCartConfirm}
        title="Очистить корзину"
        message="Вы уверены, что хотите очистить корзину? Все товары будут удалены."
        confirmText="Очистить"
        cancelText="Отмена"
        variant="danger"
      />
    </div>
  );
}
