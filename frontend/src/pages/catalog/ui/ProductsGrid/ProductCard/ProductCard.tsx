'use client';

import React, { useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import type { Product } from '@/entities/product';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';

import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  isCompareMode?: boolean; // Режим сравнения - скрыть кнопку сравнения, показать кнопку удаления
  onRemoveFromCompare?: () => void; // Callback после удаления из сравнения
  partnerLogoUrl?: string | null; // URL логотипа партнёра для товаров партнёра
  showPartnerIconOnCards?: boolean; // Показывать иконку партнёра на карточках
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isCompareMode = false,
  onRemoveFromCompare,
  partnerLogoUrl = null,
  showPartnerIconOnCards = true,
}) => {
  const { toggleWishlist, isInWishlist, checkInWishlist, wishlist } = useWishlist();
  const { toggleCompare, isInCompare, checkInCompare, compare, removeFromCompare } = useCompare();
  const { cart, addToCart, updateQuantity } = useCart();
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

  // Получаем ID товара один раз
  const productId = useMemo(() => getProductId(), [product.id, product.originalId]);

  // Используем глобальное состояние напрямую - автоматически обновляется при изменении wishlist/compare
  const isFavorite = useMemo(() => isInWishlist(productId), [isInWishlist, productId, wishlist]);
  const isInCompareState = useMemo(() => isInCompare(productId), [isInCompare, productId, compare]);

  // Проверяем, находится ли товар в избранном при монтировании
  useEffect(() => {
    // Проверяем на сервере при монтировании или смене товара
    checkInWishlist(productId).catch(() => {
      // Игнорируем ошибки (пользователь может быть не авторизован)
    });
  }, [product.id, productId, checkInWishlist]); // Проверяем только при смене товара

  // Проверяем, находится ли товар в сравнении при монтировании
  useEffect(() => {
    // Проверяем на сервере при монтировании или смене товара
    checkInCompare(productId).catch(() => {
      // Игнорируем ошибки (пользователь может быть не авторизован)
    });
  }, [product.id, productId, checkInCompare]); // Проверяем только при смене товара

  // price - актуальная цена товара, oldPrice - старая цена (если есть скидка)
  const finalPrice = product.price;
  const oldPrice = product.oldPrice;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsLoading(true);
      await toggleWishlist(productId);
      // Состояние обновится автоматически через глобальный контекст
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
    e.nativeEvent.stopImmediatePropagation();

    if (isCompareLoading) {
      return;
    }

    try {
      setIsCompareLoading(true);
      await toggleCompare(productId);
      // Состояние обновится автоматически через глобальный контекст
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

  const handleRemoveFromCompare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      setIsCompareLoading(true);
      await removeFromCompare(productId);
      // Состояние обновится автоматически через глобальный контекст
      // Вызываем callback для обновления списка на странице сравнения
      if (onRemoveFromCompare) {
        onRemoveFromCompare();
      }
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Произошла ошибка при удалении из сравнения');
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

          {/* Иконка партнёра — левый нижний угол картинки */}
          {product.isPartnerProduct &&
            showPartnerIconOnCards &&
            product.partnerShowLogoOnCards !== false &&
            (product.partnerLogoUrl ?? partnerLogoUrl) && (
              <div
                className={styles.partnerBadge}
                title={
                  product.partnerShowTooltip !== false
                    ? product.partnerTooltipText?.trim() ||
                      `Товар Партнёра : ${product.partnerName || 'Партнёр'}`
                    : undefined
                }
              >
                <img
                  src={product.partnerLogoUrl ?? partnerLogoUrl ?? ''}
                  alt="Партнёр"
                  className={styles.partnerLogo}
                />
              </div>
            )}

          <div className={styles.actionButtons}>
            {isCompareMode ? (
              <button
                type="button"
                className={`${styles.removeButton} ${isCompareLoading ? styles.compareButtonLoading : ''}`}
                aria-label="Удалить из сравнения"
                onClick={handleRemoveFromCompare}
                style={{ pointerEvents: isCompareLoading ? 'none' : 'auto' }}
              >
                🗑
              </button>
            ) : (
              <button
                type="button"
                className={`${styles.compareButton} ${isInCompareState ? styles.compareButtonActive : ''} ${isCompareLoading ? styles.compareButtonLoading : ''}`}
                aria-label={isInCompareState ? 'Удалить из сравнения' : 'Добавить в сравнение'}
                onClick={handleCompareClick}
                style={{ pointerEvents: isCompareLoading ? 'none' : 'auto' }}
              >
                ⚖
              </button>
            )}
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

          {(product.rating > 0 || (product.reviewsCount ?? 0) > 0) && (
            <div className={styles.rating}>
              {'★'.repeat(Math.floor(product.rating || 0))}
              {'☆'.repeat(5 - Math.floor(product.rating || 0))}
              <span className={styles.ratingValue}>
                ({product.rating?.toFixed(1) ?? '0'})
                {(product.reviewsCount ?? 0) > 0 && ` · ${product.reviewsCount}`}
              </span>
            </div>
          )}

          <div className={styles.price}>
            {oldPrice && <span className={styles.oldPrice}>{oldPrice.toLocaleString()} ₽</span>}
            <span className={styles.finalPrice}>{finalPrice.toLocaleString()} ₽</span>
          </div>

          {(() => {
            // Проверяем основной товар в корзине
            const cartItem = cart.find(
              (item) =>
                item.productId !== null &&
                item.componentId === null &&
                String(item.productId) === String(productId)
            );
            const quantity = cartItem ? Number(cartItem.quantity) : 0;
            const isInCart = quantity > 0;

            // Проверяем комплектующие этого товара в корзине
            // Сопоставляем по productId (originalId если есть, иначе id) или по числовому id как fallback
            const componentItems = cart.filter((item) => {
              if (
                item.componentId === null ||
                item.productId !== null ||
                item.component === null ||
                item.component.product === null
              ) {
                return false;
              }
              const componentProductId = String(item.component.product.id);
              // Основное сопоставление: component.product.id должен совпадать с productId
              // productId это либо originalId (если есть), либо String(id)
              if (componentProductId === String(productId)) {
                return true;
              }
              // Fallback: проверяем числовой id на случай несоответствия
              // (если backend вернул числовой id, а frontend использует originalId)
              if (componentProductId === String(product.id)) {
                return true;
              }
              return false;
            });
            const componentsTotalQuantity = componentItems.reduce(
              (sum, item) => sum + Number(item.quantity),
              0
            );
            const hasComponents = componentsTotalQuantity > 0;

            if (isInCart) {
              return (
                <div className={styles.cartControls}>
                  <div className={styles.cartInfo}>
                    <span className={styles.inCartLabel}>В корзине</span>
                    {hasComponents && (
                      <div className={styles.componentsIconWrapper}>
                        <span className={styles.componentsBadge}>
                          {componentsTotalQuantity > 99 ? '99+' : componentsTotalQuantity}
                        </span>
                      </div>
                    )}
                  </div>
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

            // Если товара нет в корзине, но есть комплектующие
            if (hasComponents && !isInCart) {
              return (
                <div className={styles.cartControlsYellow}>
                  <div className={styles.cartInfo}>
                    <span className={styles.inCartLabel}>В корзине</span>
                  </div>
                  <div className={styles.quantityDisplay}>
                    <span className={styles.quantityValue}>{componentsTotalQuantity}</span>
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
