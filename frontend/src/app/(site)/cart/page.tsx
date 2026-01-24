'use client';

import React, { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';
import { useCart } from '@/shared/lib/hooks';
import { ConfirmModal } from '@/shared/ui/ConfirmModal';

import styles from './page.module.css';

export default function CartPage() {
  const {
    cart,
    count,
    refreshCart,
    updateQuantity,
    updateComponentQuantity,
    removeFromCart,
    removeComponentFromCart,
    clearCart,
    getTotalPrice,
  } = useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);

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

  const handleQuantityChange = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) {
      return;
    }

    const itemKey = `product-${productId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await updateQuantity(productId, newQuantity);
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
    if (newQuantity < 1) {
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

  const handleRemoveItem = async (productId: string) => {
    const itemKey = `product-${productId}`;
    setUpdatingItems((prev) => new Set(prev).add(itemKey));
    try {
      await removeFromCart(productId);
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
    // Учитываем товары и комплектующие с валидными данными
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
                const itemKey = `product-${item.productId}`;
                const isUpdating = updatingItems.has(itemKey);
                const itemTotal = item.product.price * item.quantity;

                return (
                  <div key={item.id} className={styles.cartItem}>
                    <Link href={`/product/${item.product.slug}`} className={styles.itemImage}>
                      <Image
                        src={item.product.images?.[0] || '/images/products/door-placeholder.jpg'}
                        alt={item.product.name}
                        width={120}
                        height={120}
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
                      {item.product.stock !== undefined && item.product.stock === 0 && (
                        <span className={styles.outOfStockBadge}>Под заказ</span>
                      )}
                    </div>

                    <div className={styles.itemQuantity}>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(item.productId!, item.quantity - 1)}
                        disabled={isUpdating || item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className={styles.quantityValue}>{item.quantity}</span>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={() => handleQuantityChange(item.productId!, item.quantity + 1)}
                        disabled={isUpdating}
                      >
                        +
                      </button>
                    </div>

                    <div className={styles.itemTotal}>
                      <span className={styles.totalPrice}>{itemTotal.toLocaleString()} ₽</span>
                    </div>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveItem(item.productId!)}
                      disabled={isUpdating}
                      aria-label="Удалить товар"
                    >
                      ×
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
                const itemTotal = item.component.price * item.quantity;

                return (
                  <div key={item.id} className={styles.cartItem}>
                    <Link
                      href={`/product/${item.component.product.slug}`}
                      className={styles.itemImage}
                    >
                      <Image
                        src={item.component.image || '/images/products/door-placeholder.jpg'}
                        alt={item.component.name}
                        width={120}
                        height={120}
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

                    <div className={styles.itemQuantity}>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={() =>
                          handleComponentQuantityChange(item.componentId!, item.quantity - 1)
                        }
                        disabled={isUpdating || item.quantity <= 1}
                      >
                        −
                      </button>
                      <span className={styles.quantityValue}>{item.quantity}</span>
                      <button
                        type="button"
                        className={styles.quantityButton}
                        onClick={() =>
                          handleComponentQuantityChange(item.componentId!, item.quantity + 1)
                        }
                        disabled={isUpdating}
                      >
                        +
                      </button>
                    </div>

                    <div className={styles.itemTotal}>
                      <span className={styles.totalPrice}>{itemTotal.toLocaleString()} ₽</span>
                    </div>

                    <button
                      type="button"
                      className={styles.removeButton}
                      onClick={() => handleRemoveComponent(item.componentId!)}
                      disabled={isUpdating}
                      aria-label="Удалить комплектующее"
                    >
                      ×
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
              <button type="button" className={styles.checkoutButton}>
                Оформить заказ
              </button>
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
