'use client';

import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React from 'react';
import { createPortal } from 'react-dom';

import Link from 'next/link';

import type { PublicComponentDraftRow } from '@/shared/api/product-components';
import { isAuthRequiredForCartError } from '@/shared/lib/cart-auth-required';
import {
  PRODUCT_AVAILABILITY_LABEL,
  getProductAvailability,
} from '@/shared/lib/product-availability';
import { touchPublicSiteEditModeActivity } from '@/shared/lib/public-site-edit-mode';
import { publicUploadUrl } from '@/shared/lib/public-upload-url';
import { escapeHtmlAndPreserveNewlines, getSafeHref } from '@/shared/lib/sanitize';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';

import { ProductComponents } from './ProductComponents';
import styles from './ProductDetailPage.module.css';
import { ProductReviewsSection } from './ProductReviewsSection';
import { ProductVideoPlayer } from './ProductVideoPlayer';
import type { ProductDetailPageModel } from './hooks/useProductDetailPage';
import type { DeliveryType, ProductVariant } from './product-detail-page.types';
import {
  catalogBadgeIdsFromProduct,
  catalogProductsHref,
  serializePublicAttributeDraft,
  serializePublicComponentsDraft,
} from './product-detail-page.utils';

type ProductDetailPageViewProps = {
  model: ProductDetailPageModel;
};

export function ProductDetailPageView({ model }: ProductDetailPageViewProps) {
  const {
    cart,
    addToCart,
    addComponentToCart,
    updateQuantity,
    updateCartItemQuantityById,
    product,
    loading,
    error,
    selectedImage,
    setSelectedImage,
    isLightboxOpen,
    lightboxIndex,
    isMounted,
    isAddingToCart,
    setIsAddingToCart,
    isWishlistLoading,
    isCompareLoading,
    variants,
    setVariants,
    addingToCart,
    setAddingToCart,
    components,
    showPublicAttrsToolbar,
    isEditingPublicAttrs,
    setIsEditingPublicAttrs,
    draftAttributes,
    setDraftAttributes,
    savingPublicAttrs,
    isEditingPublicPrice,
    setIsEditingPublicPrice,
    draftPrice,
    setDraftPrice,
    savingPublicPrice,
    isEditingPublicDescription,
    setIsEditingPublicDescription,
    draftDescription,
    setDraftDescription,
    savingPublicDescription,
    isEditingPublicComponents,
    setIsEditingPublicComponents,
    draftComponents,
    setDraftComponents,
    savingPublicComponents,
    badgeDefinitions,
    isEditingPublicBadges,
    setIsEditingPublicBadges,
    draftCatalogBadgeIds,
    setDraftCatalogBadgeIds,
    savingPublicBadges,
    attrsEditBaselineRef,
    priceEditBaselineRef,
    descriptionEditBaselineRef,
    componentsEditBaselineRef,
    badgesEditBaselineRef,
    variantNotification,
    setVariantNotification,
    selectedCardVariantIndex,
    setSelectedCardVariantIndex,
    cardVariants,
    selectedCardVariant,
    displayPrice,
    isPublicAttrsDirty,
    isPublicPriceDirty,
    isPublicDescriptionDirty,
    isPublicComponentsDirty,
    isPublicBadgesDirty,
    showBadgePublicEditBlock,
    getCartItemForVariant,
    kitComponentsForCart,
    isFavorite,
    isInCompareState,
    handleFavoriteClick,
    handleCompareClick,
    openLightbox,
    closeLightbox,
    goToPrevImage,
    goToNextImage,
    kitPrice,
    attributesArray,
    attributesEditableRows,
    showAttributesSection,
    toggleDraftCatalogBadgeId,
    exitPublicBadgesEdit,
    handleSavePublicCatalogBadges,
    handleSavePublicAttributes,
    handleSavePublicPrice,
    handleSavePublicDescription,
    exitPublicPriceEdit,
    exitPublicAttrsEdit,
    exitPublicDescriptionEdit,
    handleDraftComponentChange,
    exitPublicComponentsEdit,
    handleSavePublicComponents,
  } = model;

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Загрузка товара...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h1>Ошибка</h1>
          <p>{error || 'Товар не найден'}</p>
          <Link href="/" className={styles.backLink}>
            Вернуться на главную
          </Link>
        </div>
      </div>
    );
  }

  const price = displayPrice;
  const comparePrice =
    !selectedCardVariant && product.comparePrice ? parseFloat(product.comparePrice) : null;
  const discount = comparePrice ? Math.round(((comparePrice - price) / comparePrice) * 100) : null;

  // Формируем хлебные крошки
  const breadcrumbs = [
    { label: 'Главная', href: '/' },
    { label: 'Каталог', href: '/catalog/products' },
  ];

  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.parent.name,
      href: catalogProductsHref(product.category.parent.slug),
    });
  }

  // URL подкатегории как в каталоге и в админке (навигация): /catalog/products/{parent}/{child.slug}
  // Второй сегмент — полный slug листовой категории из API (не суффикс без префикса родителя):
  // иначе Next открывает несуществующий маршрут, ломается клиентская навигация и хлебные крошки.
  if (product.category.parent) {
    breadcrumbs.push({
      label: product.category.name,
      href: catalogProductsHref(product.category.parent.slug, product.category.slug),
    });
  } else {
    breadcrumbs.push({
      label: product.category.name,
      href: catalogProductsHref(product.category.slug),
    });
  }

  return (
    <div className={styles.container}>
      {/* Кастомное уведомление при невыбранных параметрах варианта */}
      {variantNotification && (
        <div className={styles.variantNotification} role="alert" aria-live="polite">
          <span className={styles.variantNotificationIcon}>!</span>
          <span className={styles.variantNotificationText}>{variantNotification}</span>
          <button
            type="button"
            className={styles.variantNotificationClose}
            onClick={() => setVariantNotification(null)}
            aria-label="Закрыть"
          >
            ×
          </button>
        </div>
      )}

      {/* Хлебные крошки */}
      <nav className={styles.breadcrumbs}>
        {breadcrumbs.map((item, index) => (
          <span key={index}>
            <Link href={getSafeHref(item.href, '/')} className={styles.breadcrumbLink}>
              {item.label}
            </Link>
            {index < breadcrumbs.length - 1 && (
              <span className={styles.breadcrumbSeparator}>/</span>
            )}
          </span>
        ))}
        <span className={styles.breadcrumbSeparator}>/</span>
        <span className={styles.breadcrumbCurrent}>{product.name}</span>
      </nav>

      <div className={styles.productLayout}>
        {/* Галерея изображений */}
        <div className={styles.gallery}>
          <div className={styles.galleryMainRow}>
            <div className={styles.galleryLeftBadges}>
              {(product.cardBadgeSelections ?? [])
                .slice()
                .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                .map((s) => s.badge)
                .filter((b) => b.imageUrl)
                .map((b) => {
                  const hoverText = b.description?.trim() || b.label || '';
                  return (
                    <BadgeTooltip key={b.id} content={hoverText} side="right">
                      <img
                        src={publicUploadUrl(b.imageUrl)}
                        alt={b.label}
                        className={styles.catalogBadgeDetailImg}
                      />
                    </BadgeTooltip>
                  );
                })}
            </div>
            <div className={styles.mainImage}>
              {product.images.length > 0 ? (
                <button
                  type="button"
                  className={styles.mainImageButton}
                  onClick={() => openLightbox(selectedImage)}
                  aria-label="Открыть изображение"
                >
                  <img
                    src={product.images[selectedImage]}
                    alt={product.name}
                    className={styles.image}
                  />
                </button>
              ) : (
                <div className={styles.noImage}>Нет изображения</div>
              )}
            </div>
            <div className={styles.galleryRightBadges}>
              {product.isFeatured && <span className={styles.hitBadge}>ХИТ</span>}
              {product.isNew && <span className={styles.newBadge}>Новинка</span>}
              {discount != null && discount > 0 && (
                <span className={styles.discountBadge}>-{discount}%</span>
              )}
              {product.videoUrl && (
                <span className={styles.videoBadge} title="Есть видео о товаре">
                  ▶ Видео
                </span>
              )}
            </div>
          </div>

          {showBadgePublicEditBlock && (
            <div className={styles.galleryBadgePublicEdit}>
              <div className={styles.galleryBadgePublicEditHeader}>
                <span className={styles.galleryBadgePublicEditLabel}>Бэйджи слева от фото</span>
                <div className={styles.attributesToolbar}>
                  {!isEditingPublicBadges ? (
                    <button
                      type="button"
                      className={styles.attributesEditBtn}
                      onClick={() => {
                        touchPublicSiteEditModeActivity();
                        const ids = catalogBadgeIdsFromProduct(product);
                        badgesEditBaselineRef.current = JSON.stringify(ids);
                        setDraftCatalogBadgeIds([...ids]);
                        setIsEditingPublicBadges(true);
                      }}
                      title="Редактировать бэйджи"
                      aria-label="Редактировать бэйджи"
                    >
                      <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                    </button>
                  ) : (
                    <div className={styles.publicEditToolbarActions}>
                      <button
                        type="button"
                        className={styles.attributesCancelBtn}
                        onClick={exitPublicBadgesEdit}
                        disabled={savingPublicBadges}
                        title="Закрыть без сохранения"
                        aria-label="Закрыть без сохранения"
                      >
                        <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                      </button>
                      <button
                        type="button"
                        className={styles.attributesSaveBtn}
                        onClick={() => void handleSavePublicCatalogBadges()}
                        disabled={savingPublicBadges || !isPublicBadgesDirty}
                        title={savingPublicBadges ? 'Сохранение...' : 'Сохранить'}
                        aria-label={savingPublicBadges ? 'Сохранение...' : 'Сохранить'}
                      >
                        <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              {isEditingPublicBadges && (
                <>
                  <p className={styles.galleryBadgeHint}>
                    Выбрано: {draftCatalogBadgeIds.length} / 5. На карточке в каталоге показываются
                    только бэйджи с загруженной картинкой.
                  </p>
                  <div className={styles.galleryBadgePickGrid}>
                    {badgeDefinitions.map((b) => {
                      const id = String(b.id);
                      const checked = draftCatalogBadgeIds.some((x) => String(x) === id);
                      return (
                        <div
                          key={id}
                          className={styles.galleryBadgePickItem}
                          role="checkbox"
                          aria-checked={checked}
                          tabIndex={0}
                          aria-label={b.label}
                          onClick={() => toggleDraftCatalogBadgeId(id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleDraftCatalogBadgeId(id);
                            }
                          }}
                        >
                          <input
                            type="checkbox"
                            className={styles.galleryBadgePickCheckbox}
                            checked={checked}
                            tabIndex={-1}
                            aria-hidden
                            onChange={() => {
                              /* переключение только через onClick строки — избегаем двойного change у <label>+controlled checkbox */
                            }}
                          />
                          {b.imageUrl ? (
                            <span className={styles.galleryBadgePickThumb}>
                              <img src={publicUploadUrl(b.imageUrl)} alt="" />
                            </span>
                          ) : null}
                          <span>{b.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}

          {product.images.length > 1 && (
            <div className={styles.thumbnails}>
              {product.images.map((img, index) => (
                <button
                  key={index}
                  type="button"
                  className={`${styles.thumbnail} ${index === selectedImage ? styles.thumbnailActive : ''}`}
                  onClick={() => setSelectedImage(index)}
                >
                  <img src={img} alt={`${product.name} - ${index + 1}`} />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Информация о товаре */}
        <div className={styles.info}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>{product.name}</h1>
            <div className={styles.titleAvailability}>
              {(() => {
                const av = getProductAvailability(product.stock, product.onOrder);
                const cls =
                  av === 'in_stock'
                    ? styles.inStock
                    : av === 'on_order'
                      ? styles.onOrder
                      : styles.soldOut;
                const prefix = av === 'in_stock' ? '✓ ' : '';
                return (
                  <span className={cls}>
                    {prefix}
                    {PRODUCT_AVAILABILITY_LABEL[av]}
                  </span>
                );
              })()}
            </div>
          </div>

          {product.sku && <p className={styles.sku}>Артикул: {product.sku}</p>}

          {cardVariants.length > 0 && (
            <div className={styles.cardVariantsSection}>
              <span className={styles.cardVariantsLabel}>Вариант:</span>
              <div className={styles.cardVariantsChips}>
                {cardVariants.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    className={`${styles.cardVariantChip} ${i === selectedCardVariantIndex ? styles.cardVariantChipActive : ''}`}
                    onClick={() => setSelectedCardVariantIndex(i)}
                    title={v.name}
                  >
                    {v.image ? (
                      <img src={v.image} alt="" className={styles.cardVariantChipImg} />
                    ) : (
                      <span>{v.color || v.size || v.name || `${i + 1}`}</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedCardVariant && (
                <p className={styles.cardVariantName}>{selectedCardVariant.name}</p>
              )}
            </div>
          )}

          <div className={styles.priceBlock}>
            <div className={styles.priceRowCluster}>
              <div className={styles.pricesRow}>
                {components.length > 0 ? (
                  <>
                    <div className={styles.priceBox}>
                      <span className={styles.priceLabel}>полотно</span>
                      <div
                        className={`${styles.priceInfo} ${isEditingPublicPrice ? styles.priceInfoEditing : ''}`}
                      >
                        {comparePrice && (
                          <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
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
                          <span className={styles.price}>{price.toLocaleString()} ₽</span>
                        )}
                      </div>
                    </div>
                    <div
                      className={`${styles.priceBox} ${styles.priceBoxTooltip}`}
                      data-tooltip="В комплект входит: полотно 1шт., стойка коробки 2,5шт., наличники 5шт."
                    >
                      <span className={styles.priceLabel}>комплект</span>
                      <div className={styles.priceInfo}>
                        <span className={styles.price}>
                          {(kitPrice ?? price).toLocaleString('ru-RU')} ₽
                        </span>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className={styles.priceItem}>
                    <div
                      className={`${styles.priceInfo} ${isEditingPublicPrice ? styles.priceInfoEditing : ''}`}
                    >
                      {comparePrice && (
                        <span className={styles.oldPrice}>{comparePrice.toLocaleString()} ₽</span>
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
                        <span className={styles.price}>{price.toLocaleString()} ₽</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {showPublicAttrsToolbar && (
                <div className={styles.publicPriceToolbar}>
                  {!isEditingPublicPrice ? (
                    <button
                      type="button"
                      className={styles.attributesEditBtn}
                      onClick={() => {
                        touchPublicSiteEditModeActivity();
                        const src = selectedCardVariant
                          ? String(
                              typeof selectedCardVariant.price === 'string'
                                ? selectedCardVariant.price
                                : selectedCardVariant.price
                            )
                          : product.price;
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
              )}
            </div>
            <div className={styles.priceActions}>
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
                disabled={isWishlistLoading}
              >
                {isFavorite ? '♥' : '♡'}
              </button>
            </div>
          </div>

          <div className={styles.actions}>
            {(() => {
              if (!product) return null;

              const productId = String(product.id);

              // Если есть варианты исполнения, показываем компактный блок вариантов
              const hasVariants =
                (product.sizes && Array.isArray(product.sizes) && product.sizes.length > 0) ||
                (product.openingSide &&
                  Array.isArray(product.openingSide) &&
                  product.openingSide.length > 0);

              if (hasVariants) {
                return (
                  <div className={styles.variantsCompact}>
                    <div className={styles.variantsListCompact}>
                      {variants.map((variant) => {
                        const cartItem = getCartItemForVariant(variant.size, variant.openingSide);
                        const isInCart = cartItem !== null;
                        const cartQuantity = cartItem ? Number(cartItem.quantity) : 0;
                        const isAdding = addingToCart[variant.id] || false;

                        return (
                          <div key={variant.id} className={styles.variantItemCompact}>
                            <div className={styles.variantRowCompact}>
                              {product.sizes &&
                                Array.isArray(product.sizes) &&
                                product.sizes.length > 0 && (
                                  <div className={styles.variantFieldCompact}>
                                    <label className={styles.variantLabelCompact}>Размер:</label>
                                    <select
                                      value={variant.size}
                                      onChange={(e) => {
                                        setVariants((prev) =>
                                          prev.map((v) =>
                                            v.id === variant.id ? { ...v, size: e.target.value } : v
                                          )
                                        );
                                      }}
                                      className={styles.optionSelectCompact}
                                    >
                                      <option value="">Выберите</option>
                                      {product.sizes.map((size) => (
                                        <option key={size} value={size}>
                                          {size}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {product.openingSide &&
                                Array.isArray(product.openingSide) &&
                                product.openingSide.length > 0 && (
                                  <div className={styles.variantFieldCompact}>
                                    <label className={styles.variantLabelCompact}>Сторона:</label>
                                    <select
                                      value={variant.openingSide}
                                      onChange={(e) => {
                                        setVariants((prev) =>
                                          prev.map((v) =>
                                            v.id === variant.id
                                              ? { ...v, openingSide: e.target.value }
                                              : v
                                          )
                                        );
                                      }}
                                      className={styles.optionSelectCompact}
                                    >
                                      <option value="">Выберите</option>
                                      {product.openingSide.map((side) => (
                                        <option key={side} value={side}>
                                          {side}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}

                              {components.length > 0 && (
                                <div className={styles.variantFieldCompact}>
                                  <label className={styles.variantLabelCompact}>Тип:</label>
                                  <select
                                    value={variant.deliveryType}
                                    onChange={(e) => {
                                      setVariants((prev) =>
                                        prev.map((v) =>
                                          v.id === variant.id
                                            ? {
                                                ...v,
                                                deliveryType: e.target.value as DeliveryType,
                                              }
                                            : v
                                        )
                                      );
                                    }}
                                    className={styles.optionSelectCompact}
                                  >
                                    <option value="">Выберите тип</option>
                                    <option value="polotno">Полотно</option>
                                    <option value="komplekt">Комплект</option>
                                  </select>
                                </div>
                              )}

                              {variants.length > 1 && (
                                <button
                                  type="button"
                                  className={styles.removeVariantButtonCompact}
                                  onClick={() => {
                                    setVariants((prev) => prev.filter((v) => v.id !== variant.id));
                                  }}
                                  title="Удалить вариант"
                                  aria-label="Удалить вариант"
                                >
                                  🗑️
                                </button>
                              )}

                              <div className={styles.variantActionsCompact}>
                                {isInCart && cartItem ? (
                                  <div className={styles.cartControlsCompact}>
                                    <span className={styles.inCartLabelCompact}>В корзине</span>
                                    <div
                                      className={styles.quantityControlsCompact}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (isAdding || !cartItem) return;
                                          try {
                                            const newQuantity = Number(cartQuantity) - 1;
                                            if (newQuantity < 0) return;
                                            await updateCartItemQuantityById(
                                              cartItem.id,
                                              newQuantity
                                            );
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
                                        disabled={isAdding || !cartItem}
                                      >
                                        −
                                      </button>
                                      <span className={styles.quantityValueCompact}>
                                        {cartQuantity}
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={async (e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          if (isAdding || !cartItem) return;
                                          try {
                                            const newQuantity = Number(cartQuantity) + 1;
                                            await updateCartItemQuantityById(
                                              cartItem.id,
                                              newQuantity
                                            );
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
                                        disabled={isAdding || !cartItem}
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <>
                                    <div className={styles.quantitySelectorCompact}>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={() => {
                                          const newQuantity = Math.max(1, variant.quantity - 1);
                                          setVariants((prev) =>
                                            prev.map((v) =>
                                              v.id === variant.id
                                                ? { ...v, quantity: newQuantity }
                                                : v
                                            )
                                          );
                                        }}
                                        disabled={variant.quantity <= 1}
                                      >
                                        −
                                      </button>
                                      <span className={styles.quantityValueCompact}>
                                        {variant.quantity}
                                      </span>
                                      <button
                                        type="button"
                                        className={styles.quantityButtonCompact}
                                        onClick={() => {
                                          const newQuantity = variant.quantity + 1;
                                          setVariants((prev) =>
                                            prev.map((v) =>
                                              v.id === variant.id
                                                ? { ...v, quantity: newQuantity }
                                                : v
                                            )
                                          );
                                        }}
                                      >
                                        +
                                      </button>
                                    </div>
                                    <button
                                      type="button"
                                      className={styles.addToCartButtonCompact}
                                      onClick={async () => {
                                        if (!product) return;

                                        const hasSize =
                                          !product.sizes?.length || !!variant.size?.trim();
                                        const hasOpeningSide =
                                          !product.openingSide?.length ||
                                          !!variant.openingSide?.trim();
                                        const hasType =
                                          components.length === 0 ||
                                          variant.deliveryType === 'polotno' ||
                                          variant.deliveryType === 'komplekt';

                                        if (!hasSize || !hasOpeningSide || !hasType) {
                                          const messages: string[] = [];
                                          if (!hasSize) messages.push('Выберите размер двери');
                                          if (!hasOpeningSide)
                                            messages.push('Выберите сторону открывания двери');
                                          if (!hasType)
                                            messages.push('Выберите «полотно» или «комплект»');
                                          setVariantNotification(
                                            messages.length === 1
                                              ? messages[0]
                                              : messages.join('\n')
                                          );
                                          return;
                                        }

                                        const doAdd = async () => {
                                          setAddingToCart((prev) => ({
                                            ...prev,
                                            [variant.id]: true,
                                          }));
                                          try {
                                            await addToCart(
                                              productId,
                                              variant.quantity,
                                              variant.size && variant.size.trim()
                                                ? variant.size
                                                : undefined,
                                              variant.openingSide && variant.openingSide.trim()
                                                ? variant.openingSide
                                                : undefined
                                            );
                                            if (
                                              variant.deliveryType === 'komplekt' &&
                                              kitComponentsForCart
                                            ) {
                                              const qty = variant.quantity;
                                              const stoikaQty =
                                                kitComponentsForCart.stoikaKorobka.kitQuantity ??
                                                2.5;
                                              const nalichnikQty =
                                                kitComponentsForCart.nalichnik.kitQuantity ?? 5;
                                              await addComponentToCart(
                                                kitComponentsForCart.stoikaKorobka.id,
                                                stoikaQty * qty
                                              );
                                              await addComponentToCart(
                                                kitComponentsForCart.nalichnik.id,
                                                nalichnikQty * qty
                                              );
                                            }
                                            await new Promise((resolve) =>
                                              setTimeout(resolve, 100)
                                            );
                                          } catch (error) {
                                            if (isAuthRequiredForCartError(error)) {
                                              return;
                                            }
                                            if (error instanceof Error) {
                                              alert(error.message);
                                            } else {
                                              alert(
                                                'Произошла ошибка при добавлении товара в корзину'
                                              );
                                            }
                                          } finally {
                                            setAddingToCart((prev) => ({
                                              ...prev,
                                              [variant.id]: false,
                                            }));
                                          }
                                        };
                                        await doAdd();
                                      }}
                                      disabled={isAdding}
                                    >
                                      {isAdding ? 'Добавление...' : 'В корзину'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Кнопка добавления варианта */}
                    <button
                      type="button"
                      className={styles.addVariantButtonCompact}
                      onClick={() => {
                        const newVariant: ProductVariant = {
                          id: `variant-${Date.now()}-${Math.random()}`,
                          size: '',
                          openingSide: '',
                          quantity: 1,
                          deliveryType: '',
                        };
                        setVariants((prev) => [...prev, newVariant]);
                      }}
                    >
                      + Новый товар
                    </button>
                  </div>
                );
              }

              // Интерфейс для товаров без вариантов (или с выбором «схожего» варианта)
              const selectedCardVariantId = selectedCardVariant?.id ?? null;
              const cartItem = cart.find(
                (item) =>
                  item.productId !== null &&
                  String(item.productId) === productId &&
                  item.componentId === null &&
                  (item.cardVariantId ?? null) === selectedCardVariantId &&
                  item.size === null &&
                  item.openingSide === null
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
                            if (cartItem?.id && selectedCardVariantId !== undefined) {
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
                            if (cartItem?.id && selectedCardVariantId !== undefined) {
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

              return (
                <button
                  type="button"
                  className={`${styles.addToCartButton} ${isInCart ? styles.addToCartButtonSuccess : ''}`}
                  onClick={async () => {
                    if (!product) return;

                    try {
                      setIsAddingToCart(true);
                      await addToCart(productId, 1, undefined, undefined, selectedCardVariant?.id);
                    } catch (error) {
                      if (isAuthRequiredForCartError(error)) {
                        return;
                      }
                      if (error instanceof Error) {
                        alert(error.message);
                      } else {
                        alert('Произошла ошибка при добавлении товара в корзину');
                      }
                    } finally {
                      setIsAddingToCart(false);
                    }
                  }}
                  disabled={isAddingToCart || !product}
                >
                  {isAddingToCart
                    ? 'Добавление...'
                    : isInCart
                      ? `Добавлено в корзину ${quantity} шт.`
                      : 'Добавить в корзину'}
                </button>
              );
            })()}
          </div>

          {/* Характеристики */}
          {showAttributesSection && (
            <div className={styles.attributes}>
              <div className={styles.attributesHeader}>
                <h2 className={styles.attributesTitle}>Характеристики</h2>
                {showPublicAttrsToolbar && attributesEditableRows.length > 0 && (
                  <div className={styles.attributesToolbar}>
                    {!isEditingPublicAttrs ? (
                      <button
                        type="button"
                        className={styles.attributesEditBtn}
                        onClick={() => {
                          touchPublicSiteEditModeActivity();
                          const rows = attributesEditableRows.map((a) => ({ ...a }));
                          attrsEditBaselineRef.current = serializePublicAttributeDraft(rows);
                          setDraftAttributes(rows);
                          setIsEditingPublicAttrs(true);
                        }}
                        title="Редактировать характеристики"
                        aria-label="Редактировать характеристики"
                      >
                        <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                      </button>
                    ) : (
                      <div className={styles.publicEditToolbarActions}>
                        <button
                          type="button"
                          className={styles.attributesCancelBtn}
                          onClick={exitPublicAttrsEdit}
                          disabled={savingPublicAttrs}
                          title="Закрыть без сохранения"
                          aria-label="Закрыть без сохранения"
                        >
                          <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                        </button>
                        <button
                          type="button"
                          className={styles.attributesSaveBtn}
                          onClick={() => void handleSavePublicAttributes()}
                          disabled={savingPublicAttrs || !isPublicAttrsDirty}
                          title={savingPublicAttrs ? 'Сохранение...' : 'Сохранить'}
                          aria-label={savingPublicAttrs ? 'Сохранение...' : 'Сохранить'}
                        >
                          <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <dl className={styles.attributesList}>
                {product.weight != null && !Number.isNaN(Number(product.weight)) && (
                  <>
                    <dt>Масса</dt>
                    <dd>{`${Number(product.weight)} кг`}</dd>
                  </>
                )}
                {isEditingPublicAttrs
                  ? draftAttributes.map((attr, index) => (
                      <React.Fragment key={`${attr.slug ?? attr.name}-${index}`}>
                        <dt>{attr.name}</dt>
                        <dd>
                          <input
                            type="text"
                            className={styles.attributesInput}
                            value={attr.value}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDraftAttributes((prev) =>
                                prev.map((row, i) => (i === index ? { ...row, value: v } : row))
                              );
                            }}
                            aria-label={`Значение: ${attr.name}`}
                          />
                        </dd>
                      </React.Fragment>
                    ))
                  : attributesArray.map((attr, index) => {
                      if (!attr.value) return null;

                      return (
                        <React.Fragment key={`${attr.name}-${index}`}>
                          <dt>{attr.name}</dt>
                          <dd>{attr.value}</dd>
                        </React.Fragment>
                      );
                    })}
              </dl>
            </div>
          )}
        </div>
      </div>

      {/* Описание */}
      {(product.description?.trim() || showPublicAttrsToolbar) && (
        <div className={styles.description}>
          <div className={styles.attributesHeader}>
            <h2 className={`${styles.descriptionTitle} ${styles.descriptionTitleBar}`}>Описание</h2>
            {showPublicAttrsToolbar && (
              <div className={styles.attributesToolbar}>
                {!isEditingPublicDescription ? (
                  <button
                    type="button"
                    className={styles.attributesEditBtn}
                    onClick={() => {
                      touchPublicSiteEditModeActivity();
                      const src = product.description ?? '';
                      descriptionEditBaselineRef.current = src;
                      setDraftDescription(src);
                      setIsEditingPublicDescription(true);
                    }}
                    title="Редактировать описание"
                    aria-label="Редактировать описание"
                  >
                    <PencilSquareIcon className={styles.attributesEditIcon} aria-hidden />
                  </button>
                ) : (
                  <div className={styles.publicEditToolbarActions}>
                    <button
                      type="button"
                      className={styles.attributesCancelBtn}
                      onClick={exitPublicDescriptionEdit}
                      disabled={savingPublicDescription}
                      title="Закрыть без сохранения"
                      aria-label="Закрыть без сохранения"
                    >
                      <XMarkIcon className={styles.attributesCancelIcon} aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={styles.attributesSaveBtn}
                      onClick={() => void handleSavePublicDescription()}
                      disabled={savingPublicDescription || !isPublicDescriptionDirty}
                      title={savingPublicDescription ? 'Сохранение...' : 'Сохранить'}
                      aria-label={savingPublicDescription ? 'Сохранение...' : 'Сохранить'}
                    >
                      <CheckIcon className={styles.attributesSaveIcon} aria-hidden />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isEditingPublicDescription ? (
            <textarea
              className={styles.descriptionTextarea}
              value={draftDescription}
              onChange={(e) => setDraftDescription(e.target.value)}
              rows={10}
              aria-label="Текст описания"
            />
          ) : product.description?.trim() ? (
            <div
              className={styles.descriptionText}
              dangerouslySetInnerHTML={{
                __html: escapeHtmlAndPreserveNewlines(product.description),
              }}
            />
          ) : (
            <p className={styles.descriptionEmpty}>Описание не заполнено</p>
          )}
        </div>
      )}

      {/* Видео о товаре */}
      {product.videoUrl && (
        <div className={styles.productVideo}>
          <h2 className={styles.descriptionTitle}>Видео о товаре</h2>
          <ProductVideoPlayer url={product.videoUrl} />
        </div>
      )}

      {/* Комплектующие */}
      <ProductComponents
        productId={product.id}
        initialComponents={components}
        publicToolbar={
          showPublicAttrsToolbar && components.length > 0
            ? {
                show: true,
                isEditing: isEditingPublicComponents,
                onStartEdit: () => {
                  touchPublicSiteEditModeActivity();
                  const rows: PublicComponentDraftRow[] = components.map((c) => ({
                    id: c.id,
                    name: c.name,
                    type: c.type,
                    price: String(c.price),
                  }));
                  componentsEditBaselineRef.current = serializePublicComponentsDraft(rows);
                  setDraftComponents(rows);
                  setIsEditingPublicComponents(true);
                },
                onCancel: exitPublicComponentsEdit,
                onSave: () => void handleSavePublicComponents(),
                canSave: isPublicComponentsDirty,
                saving: savingPublicComponents,
              }
            : undefined
        }
        draftRows={isEditingPublicComponents ? draftComponents : undefined}
        onDraftRowChange={handleDraftComponentChange}
      />

      {/* Отзывы */}
      <ProductReviewsSection
        productId={product.id}
        productName={product.name}
        initialRating={product.rating}
        initialReviewsCount={product.reviewsCount}
        initialReviews={product.reviews}
      />

      {/* Лайтбокс через Portal — рендерится в body, вне иерархии компонентов */}
      {isMounted &&
        isLightboxOpen &&
        product.images.length > 0 &&
        createPortal(
          <div className={styles.lightbox} onClick={closeLightbox}>
            <button
              type="button"
              className={styles.lightboxClose}
              onClick={(e) => {
                e.stopPropagation();
                closeLightbox();
              }}
              aria-label="Закрыть"
            >
              ✕
            </button>

            {product.images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxArrow} ${styles.lightboxArrowLeft}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToPrevImage();
                }}
                aria-label="Предыдущее изображение"
              >
                ‹
              </button>
            )}

            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <img
                src={product.images[lightboxIndex]}
                alt={`${product.name} - ${lightboxIndex + 1}`}
                className={styles.lightboxImage}
              />
            </div>

            {product.images.length > 1 && (
              <button
                type="button"
                className={`${styles.lightboxArrow} ${styles.lightboxArrowRight}`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToNextImage();
                }}
                aria-label="Следующее изображение"
              >
                ›
              </button>
            )}

            {product.images.length > 1 && (
              <div className={styles.lightboxCounter}>
                {lightboxIndex + 1} / {product.images.length}
              </div>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
