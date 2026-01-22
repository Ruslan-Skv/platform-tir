'use client';

import React, { useEffect, useState } from 'react';

import Image from 'next/image';
import Link from 'next/link';

import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';
import { useCart } from '@/shared/lib/hooks';

import styles from './page.module.css';

export default function CartPage() {
  const { cart, count, refreshCart, updateQuantity, removeFromCart, clearCart, getTotalPrice } =
    useCart();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

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

    setUpdatingItems((prev) => new Set(prev).add(productId));
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
        next.delete(productId);
        return next;
      });
    }
  };

  const handleRemoveItem = async (productId: string) => {
    setUpdatingItems((prev) => new Set(prev).add(productId));
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
        next.delete(productId);
        return next;
      });
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Вы уверены, что хотите очистить корзину?')) {
      return;
    }

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
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

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
            {cart.map((item) => {
              const isUpdating = updatingItems.has(item.productId);
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
                  </div>

                  <div className={styles.itemQuantity}>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(item.productId, item.quantity - 1)}
                      disabled={isUpdating || item.quantity <= 1}
                    >
                      −
                    </button>
                    <span className={styles.quantityValue}>{item.quantity}</span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={() => handleQuantityChange(item.productId, item.quantity + 1)}
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
                    onClick={() => handleRemoveItem(item.productId)}
                    disabled={isUpdating}
                    aria-label="Удалить товар"
                  >
                    ×
                  </button>
                </div>
              );
            })}

            <div className={styles.cartActions}>
              <button type="button" className={styles.clearButton} onClick={handleClearCart}>
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
    </div>
  );
}
