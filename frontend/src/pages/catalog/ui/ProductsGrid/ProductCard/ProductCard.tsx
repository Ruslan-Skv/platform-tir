'use client';

import React, { useEffect, useState } from 'react';

import Link from 'next/link';

import type { Product } from '@/entities/product';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { toggleWishlist, isInWishlist, checkInWishlist } = useWishlist();
  const { toggleCompare, isInCompare, checkInCompare } = useCompare();
  const { addToCart } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCompareState, setIsInCompareState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Получаем оригинальный ID товара из API
  const getProductId = (): string => {
    // Используем originalId если он есть, иначе пробуем преобразовать id в string
    if (product.originalId) {
      return product.originalId;
    }
    // Fallback на id как string
    return String(product.id);
  };

  // Проверяем, находится ли товар в избранном при монтировании
  useEffect(() => {
    const productId = getProductId();
    const inWishlist = isInWishlist(productId);
    setIsFavorite(inWishlist);

    // Если не в локальном состоянии, проверяем на сервере
    if (!inWishlist) {
      checkInWishlist(productId)
        .then(setIsFavorite)
        .catch(() => {
          // Игнорируем ошибки (пользователь может быть не авторизован)
        });
    }
  }, [product, isInWishlist, checkInWishlist]);

  // Проверяем, находится ли товар в сравнении при монтировании
  useEffect(() => {
    const productId = getProductId();
    const inCompare = isInCompare(productId);
    setIsInCompareState(inCompare);

    // Если не в локальном состоянии, проверяем на сервере
    if (!inCompare) {
      checkInCompare(productId)
        .then(setIsInCompareState)
        .catch(() => {
          // Игнорируем ошибки (пользователь может быть не авторизован)
        });
    }
  }, [product, isInCompare, checkInCompare]);

  // price - актуальная цена товара, oldPrice - старая цена (если есть скидка)
  const finalPrice = product.price;
  const oldPrice = product.oldPrice;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const productId = getProductId();

    try {
      setIsLoading(true);
      await toggleWishlist(productId);
      setIsFavorite((prev) => !prev);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Произошла ошибка при работе с избранным');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompareClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const productId = getProductId();

    try {
      setIsCompareLoading(true);
      await toggleCompare(productId);
      setIsInCompareState((prev) => !prev);
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Произошла ошибка при работе с сравнением');
      }
    } finally {
      setIsCompareLoading(false);
    }
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const productId = getProductId();

    try {
      setIsAddingToCart(true);
      await addToCart(productId, 1);
      // Можно показать уведомление об успешном добавлении
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Произошла ошибка при добавлении в корзину');
      }
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.slug}`} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          <img src={product.image} alt={product.name} className={styles.image} loading="lazy" />

          {/* Бейджи */}
          <div className={styles.badges}>
            {product.isFeatured && <span className={styles.hitBadge}>ХИТ</span>}
            {product.isNew && <span className={styles.newBadge}>Новинка</span>}
            {product.discount && <span className={styles.discountBadge}>-{product.discount}%</span>}
          </div>

          <div className={styles.actionButtons}>
            <button
              type="button"
              className={`${styles.compareButton} ${isInCompareState ? styles.compareButtonActive : ''}`}
              aria-label={isInCompareState ? 'Удалить из сравнения' : 'Добавить в сравнение'}
              onClick={handleCompareClick}
              disabled={isCompareLoading}
            >
              ⚖
            </button>
            <button
              type="button"
              className={`${styles.favoriteButton} ${isFavorite ? styles.favoriteButtonActive : ''}`}
              aria-label={isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}
              onClick={handleFavoriteClick}
              disabled={isLoading}
            >
              {isFavorite ? '♥' : '♡'}
            </button>
          </div>
        </div>

        <div className={styles.content}>
          <h3 className={styles.name}>{product.name}</h3>
          {product.sku && <p className={styles.sku}>Арт. {product.sku}</p>}
          <p className={styles.category}>{product.category}</p>

          <div className={styles.rating}>
            {'★'.repeat(Math.floor(product.rating))}
            {'☆'.repeat(5 - Math.floor(product.rating))}
            <span className={styles.ratingValue}>({product.rating})</span>
          </div>

          <div className={styles.price}>
            {oldPrice && <span className={styles.oldPrice}>{oldPrice.toLocaleString()} ₽</span>}
            <span className={styles.finalPrice}>{finalPrice.toLocaleString()} ₽</span>
          </div>

          <button
            type="button"
            className={styles.addToCartButton}
            onClick={handleAddToCart}
            disabled={isAddingToCart}
          >
            {isAddingToCart ? 'Добавление...' : 'В корзину'}
          </button>
        </div>
      </Link>
    </div>
  );
};
