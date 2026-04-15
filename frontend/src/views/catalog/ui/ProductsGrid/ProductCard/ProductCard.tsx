'use client';

import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { Wallet } from 'lucide-react';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Link from 'next/link';

import type { Product } from '@/entities/product';
import { patchProductPricing } from '@/shared/api/admin-product-patch';
import { isCompareLimitExceededError } from '@/shared/api/compare';
import { isAuthRequiredForCartError } from '@/shared/lib/cart-auth-required';
import { emitCompareLimitExceeded } from '@/shared/lib/compare-limit-notify';
import { useCart, useCompare, useWishlist } from '@/shared/lib/hooks';
import { useCanEditCatalogOnPublic } from '@/shared/lib/hooks/useCanEditCatalogOnPublic';
import { usePublicSiteEditMode } from '@/shared/lib/hooks/usePublicSiteEditMode';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import { isPublicPriceDraftDirty } from '@/shared/lib/public-price-draft';
import { touchPublicSiteEditModeActivity } from '@/shared/lib/public-site-edit-mode';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import type { CatalogApiProduct } from '@/views/catalog/lib/mapCatalogApiProductToProduct';

import styles from './ProductCard.module.css';

interface ProductCardProps {
  product: Product;
  isCompareMode?: boolean; // Режим сравнения - скрыть кнопку сравнения, показать кнопку удаления
  compact?: boolean; // Уменьшенная карточка на узких экранах (по необходимости)
  onRemoveFromCompare?: () => void; // Callback после удаления из сравнения
  partnerLogoUrl?: string | null; // URL логотипа партнёра для товаров партнёра
  showPartnerIconOnCards?: boolean; // Показывать иконку партнёра на карточках
  /** После PATCH цены с публичного сайта — обновить товар в сетке каталога */
  onProductCatalogPatched?: (data: CatalogApiProduct) => void;
}

function saveCatalogScrollPosition(): void {
  if (typeof window === 'undefined') return;
  if (!window.location.pathname.startsWith('/catalog/products')) return;
  const urlKey = `${window.location.pathname}${window.location.search}`;
  sessionStorage.setItem(`catalog_scroll:${urlKey}`, String(window.scrollY));
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  isCompareMode = false,
  compact = false,
  onRemoveFromCompare,
  partnerLogoUrl = null,
  showPartnerIconOnCards = true,
  onProductCatalogPatched,
}) => {
  const { toggleWishlist, isInWishlist, wishlist } = useWishlist();
  const { toggleCompare, isInCompare, compare, removeFromCompare } = useCompare();
  const { cart, addToCart, updateQuantity, updateCartItemQuantityById } = useCart();
  const [isLoading, setIsLoading] = useState(false);
  const [isCompareLoading, setIsCompareLoading] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);

  const publicSiteEditMode = usePublicSiteEditMode();
  const canEditCatalogOnPublic = useCanEditCatalogOnPublic();
  const showPublicPriceEdit = publicSiteEditMode && canEditCatalogOnPublic && !isCompareMode;
  const [isEditingPublicPrice, setIsEditingPublicPrice] = useState(false);
  const [draftPrice, setDraftPrice] = useState('');
  const [savingPublicPrice, setSavingPublicPrice] = useState(false);
  const priceEditBaselineRef = useRef('');

  const cardVariants =
    product.cardVariants && product.cardVariants.length > 0 ? product.cardVariants : [];
  const selectedVariant = cardVariants[selectedVariantIndex] ?? null;

  // Отображаемые данные: при выбранном варианте — из варианта, иначе из основного товара
  const displayName = selectedVariant ? selectedVariant.name : product.name;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const displayOldPrice = selectedVariant ? undefined : product.oldPrice;
  const displayImage = selectedVariant?.image || (product.images?.[0] ?? product.image);

  const productImages =
    cardVariants.length > 0
      ? (cardVariants.map((v) => v.image || product.image).filter(Boolean) as string[])
      : product.images && product.images.length > 0
        ? product.images
        : product.image
          ? [product.image]
          : [];
  const effectiveImages =
    productImages.length > 0 ? productImages : ([product.image].filter(Boolean) as string[]);
  const hasMultipleImages = effectiveImages.length > 1;

  // Сбрасываем индекс изображения при смене товара
  useEffect(() => {
    setCurrentImageIndex(0);
  }, [product.id]);

  useEffect(() => {
    setIsEditingPublicPrice(false);
  }, [product.originalId, product.slug, selectedVariantIndex]);

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

  const finalPrice = displayPrice;
  const oldPrice = displayOldPrice;

  const isPublicPriceDirty = useMemo(() => {
    if (!isEditingPublicPrice) return false;
    return isPublicPriceDraftDirty(draftPrice, priceEditBaselineRef.current);
  }, [isEditingPublicPrice, draftPrice]);

  const exitPublicPriceEdit = useCallback(() => {
    if (savingPublicPrice) return;
    touchPublicSiteEditModeActivity();
    setDraftPrice(priceEditBaselineRef.current);
    setIsEditingPublicPrice(false);
  }, [savingPublicPrice]);

  const handleSavePublicPrice = useCallback(async () => {
    const raw = draftPrice.replace(/\s/g, '').replace(',', '.');
    const num = parseFloat(raw);
    if (!Number.isFinite(num) || num < 0) {
      alert('Укажите корректную цену (неотрицательное число)');
      return;
    }
    const variants = product.cardVariants;
    const hasVariants = variants && variants.length > 0;
    setSavingPublicPrice(true);
    try {
      const result = hasVariants
        ? await patchProductPricing(productId, {
            cardVariants: variants!.map((v, i) => ({
              name: v.name,
              price:
                i === selectedVariantIndex
                  ? num
                  : typeof v.price === 'string'
                    ? parseFloat(String(v.price))
                    : v.price,
              image: v.image?.trim() || undefined,
              size: v.size?.trim() || undefined,
              color: v.color?.trim() || undefined,
              extraOption: v.extraOption?.trim() || undefined,
              sortOrder: v.sortOrder ?? i,
            })),
          })
        : await patchProductPricing(productId, { price: num });

      if (!result.ok) {
        alert(result.message);
        return;
      }
      const data = result.data as CatalogApiProduct;
      onProductCatalogPatched?.(data);
      touchPublicSiteEditModeActivity();
      setIsEditingPublicPrice(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Не удалось сохранить цену');
    } finally {
      setSavingPublicPrice(false);
    }
  }, [draftPrice, product, productId, selectedVariantIndex, onProductCatalogPatched]);

  const availability = getProductAvailability(Number(product.stock ?? 0), product.onOrder);
  const availabilityTextClass =
    availability === 'in_stock'
      ? styles.availabilityTextInStock
      : availability === 'on_order'
        ? styles.availabilityTextOnOrder
        : styles.availabilityTextOut;

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
      if (isCompareLimitExceededError(error)) {
        emitCompareLimitExceeded();
      } else if (error instanceof Error) {
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
    const cardVariantId = selectedVariant?.id;

    try {
      setIsAddingToCart(true);
      await addToCart(productId, 1, undefined, undefined, cardVariantId);
    } catch (error) {
      if (isAuthRequiredForCartError(error)) {
        return;
      }
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
    setCurrentImageIndex((prev) => (prev === 0 ? effectiveImages.length - 1 : prev - 1));
    if (cardVariants.length > 0)
      setSelectedVariantIndex((prev) => (prev === 0 ? cardVariants.length - 1 : prev - 1));
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === effectiveImages.length - 1 ? 0 : prev + 1));
    if (cardVariants.length > 0)
      setSelectedVariantIndex((prev) => (prev === cardVariants.length - 1 ? 0 : prev + 1));
  };

  const handleImageDotClick = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex(index);
  };

  return (
    <div
      className={`${styles.productCard} ${compact ? styles.productCardCompact : ''} ${isCompareMode ? styles.productCardCompare : ''}`}
    >
      <Link
        href={`/product/${product.slug}`}
        className={styles.cardLink}
        onClick={saveCatalogScrollPosition}
      >
        <div className={styles.nameBlock}>
          <h3 className={styles.name}>{displayName}</h3>
        </div>
        <div className={styles.imageSection}>
          <div className={styles.imageSideLeft}>
            <div className={styles.catalogBadgeImages}>
              {product.catalogBadges?.map((b) => {
                const hoverText = b.description?.trim() || b.label || '';
                return (
                  <BadgeTooltip key={b.id} content={hoverText} side="right" compact>
                    <img
                      src={publicUploadUrl(b.imageUrl)}
                      alt={b.label}
                      className={styles.catalogBadgeImg}
                    />
                  </BadgeTooltip>
                );
              })}
            </div>
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
          </div>
          <div className={styles.imageContainer}>
            <img
              src={
                cardVariants.length > 0
                  ? displayImage || product.image
                  : effectiveImages[currentImageIndex] || product.image
              }
              alt={displayName}
              className={styles.image}
              loading="lazy"
            />
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
                  {effectiveImages.map((_, index) => (
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
          </div>
          <div className={styles.imageSideRight}>
            <div className={styles.textBadges}>
              {product.isFeatured && <span className={styles.hitBadge}>ХИТ</span>}
              {product.isNew && <span className={styles.newBadge}>Новинка</span>}
              {product.discount && (
                <span className={styles.discountBadge}>-{product.discount}%</span>
              )}
              {product.videoUrl && (
                <span className={styles.videoBadge} title="Есть видео о товаре">
                  ▶ Видео
                </span>
              )}
            </div>
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
        </div>

        <div className={styles.content}>
          {cardVariants.length > 0 && (
            <div className={styles.cardVariantsSelector} onClick={(e) => e.stopPropagation()}>
              {cardVariants.map((v, i) => (
                <button
                  key={v.id}
                  type="button"
                  className={`${styles.cardVariantChip} ${i === selectedVariantIndex ? styles.cardVariantChipActive : ''}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedVariantIndex(i);
                    setCurrentImageIndex(i);
                  }}
                  title={v.name}
                >
                  {v.image ? (
                    <img src={v.image} alt="" className={styles.cardVariantChipImg} />
                  ) : (
                    <span>{v.color || v.size || `${i + 1}`}</span>
                  )}
                </button>
              ))}
            </div>
          )}
          <h3 className={`${styles.name} ${styles.nameInContent}`}>{displayName}</h3>
          <div className={`${styles.skuRow} ${product.sku ? '' : styles.skuRowNoSku}`}>
            {product.sku ? <p className={styles.sku}>Арт. {product.sku}</p> : null}
            <span className={`${styles.availabilityText} ${availabilityTextClass}`}>
              {PRODUCT_AVAILABILITY_LABEL[availability]}
            </span>
          </div>
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

          <div
            className={styles.pricePublicWrap}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className={`${styles.price} ${isEditingPublicPrice ? styles.priceEditing : ''}`}>
              <span className={styles.priceLabel}>Стоимость:</span>
              <span className={styles.priceIcon} aria-hidden>
                <Wallet size={18} strokeWidth={2} />
              </span>
              {oldPrice && !isEditingPublicPrice && (
                <span className={styles.oldPrice}>{oldPrice.toLocaleString()} ₽</span>
              )}
              {isEditingPublicPrice ? (
                <span className={styles.priceEditRow}>
                  <input
                    type="text"
                    inputMode="decimal"
                    className={styles.priceEditInput}
                    value={draftPrice}
                    onChange={(e) => setDraftPrice(e.target.value)}
                    aria-label="Цена"
                  />
                  <span className={styles.priceCurrency}>₽</span>
                </span>
              ) : (
                <span className={styles.finalPrice}>{finalPrice.toLocaleString()} ₽</span>
              )}
            </div>
            {showPublicPriceEdit ? (
              <div className={styles.publicPriceToolbar}>
                {!isEditingPublicPrice ? (
                  <button
                    type="button"
                    className={styles.attributesEditBtn}
                    onClick={() => {
                      touchPublicSiteEditModeActivity();
                      const src = selectedVariant
                        ? String(selectedVariant.price)
                        : String(product.price);
                      priceEditBaselineRef.current = src;
                      setDraftPrice(src);
                      setIsEditingPublicPrice(true);
                    }}
                    title="Редактировать цену"
                    aria-label="Редактировать цену"
                  >
                    <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                  </button>
                ) : (
                  <div className={styles.publicEditToolbarActions}>
                    <button
                      type="button"
                      className={styles.attributesCancelBtn}
                      onClick={exitPublicPriceEdit}
                      disabled={savingPublicPrice}
                      title="Закрыть без сохранения"
                      aria-label="Закрыть без сохранения"
                    >
                      <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.attributesSaveBtn}
                      onClick={() => void handleSavePublicPrice()}
                      disabled={savingPublicPrice || !isPublicPriceDirty}
                      title={savingPublicPrice ? 'Сохранение...' : 'Сохранить'}
                      aria-label={savingPublicPrice ? 'Сохранение...' : 'Сохранить'}
                    >
                      <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {(() => {
            const selectedVariantId = selectedVariant?.id ?? null;
            const cartItem = cart.find(
              (item) =>
                item.productId !== null &&
                item.componentId === null &&
                String(item.productId) === String(productId) &&
                (item.cardVariantId ?? null) === selectedVariantId
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
                          if (cartItem?.id && selectedVariantId !== undefined) {
                            await updateCartItemQuantityById(cartItem.id, newQuantity);
                          } else {
                            await updateQuantity(productId, newQuantity);
                          }
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
                          if (cartItem?.id && selectedVariantId !== undefined) {
                            await updateCartItemQuantityById(cartItem.id, newQuantity);
                          } else {
                            await updateQuantity(productId, newQuantity);
                          }
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
