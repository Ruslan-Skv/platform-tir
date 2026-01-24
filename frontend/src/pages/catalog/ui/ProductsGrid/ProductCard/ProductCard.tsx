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
  const { cart, addToCart, updateQuantity } = useCart();
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInCompareState, setIsInCompareState] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Получаем массив изображений: используем images если есть, иначе [image]
  const productImages =
    product.images && product.images.length > 0
      ? product.images
      : product.image
        ? [product.image]
        : [];
  const hasMultipleImages = productImages.length > 1;

  // Сбрасываем индекс изображения при смене товара
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id]);

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

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1));
  };

  const handleImageDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  return (
    <div className={styles.productCard}>
      <Link href={`/product/${product.slug}`} className={styles.cardLink}>
        <div className={styles.imageContainer}>
          <img
            src={productImages[currentImageIndex] || product.image}
            alt={product.name}
            className={styles.image}
            loading="lazy"
          />

          {/* Навигация по изображениям */}
          {hasMultipleImages && (
            <>
              <button
                type="button"
                className={styles.imageNavButton}
                style={{ left: '0.5rem' }}
                onClick={handlePreviousImage}
                aria-label="Предыдущее изображение"
              >
                ‹
              </button>
              <button
                type="button"
                className={styles.imageNavButton}
                style={{ right: '0.5rem' }}
                onClick={handleNextImage}
                aria-label="Следующее изображение"
              >
                ›
              </button>
              <div className={styles.imageDots}>
                {productImages.map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.imageDot} ${index === currentImageIndex ? styles.imageDotActive : ''}`}
                    onClick={(e) => handleImageDotClick(e, index)}
                    aria-label={`Изображение ${index + 1}`}
                  />
                ))}
              </div>
            </>
          )}

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

          {(() => {
            const productId = getProductId();
            const cartItem = cart.find(
              (item) =>
                item.productId !== null &&
                item.componentId === null &&
                String(item.productId) === String(productId)
            );
            const quantity = cartItem ? Number(cartItem.quantity) : 0;
            const isInCart = quantity > 0;

            if (isInCart) {
              return (
                <div className={styles.cartControls}>
                  <span className={styles.inCartLabel}>В корзине</span>
                  <div className={styles.quantityControls} onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isAddingToCart) return;
                        try {
                          const newQuantity = Number(quantity) - 1;
                          if (newQuantity < 0) return;
                          await updateQuantity(productId, newQuantity);
                        } catch (error) {
                          if (error instanceof Error) {
                            alert(error.message);
                          } else {
                            alert('Произошла ошибка при обновлении количества');
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      disabled={isAddingToCart}
                    >
                      −
                    </button>
                    <span className={styles.quantityValue}>{quantity}</span>
                    <button
                      type="button"
                      className={styles.quantityButton}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (isAddingToCart) return;
                        try {
                          const newQuantity = Number(quantity) + 1;
                          await updateQuantity(productId, newQuantity);
                        } catch (error) {
                          if (error instanceof Error) {
                            alert(error.message);
                          } else {
                            alert('Произошла ошибка при обновлении количества');
                          }
                        }
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      disabled={isAddingToCart}
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                type="button"
                className={styles.addToCartButton}
                onClick={handleAddToCart}
                disabled={isAddingToCart}
              >
                {isAddingToCart ? 'Добавление...' : 'В корзину'}
              </button>
            );
          })()}
        </div>
      </Link>
    </div>
  );
};
