'use client';

import { CheckIcon, PencilSquareIcon, XMarkIcon } from '@heroicons/react/24/outline';

import React, { useEffect, useState } from 'react';

import {
  type ProductComponent,
  type PublicComponentDraftRow,
  getProductComponents,
} from '@/shared/api/product-components';
import { isAuthRequiredForCartError } from '@/shared/lib/cart-auth-required';
import { useCart } from '@/shared/lib/hooks';

import styles from './ProductComponents.module.css';
import pageStyles from './ProductDetailPage.module.css';

export interface ProductComponentsPublicToolbar {
  show: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onCancel: () => void;
  onSave: () => void | Promise<void>;
  canSave: boolean;
  saving: boolean;
}

interface ProductComponentsProps {
  productId: string;
  /** Переданные с родителя комплектующие — используются вместо отдельного запроса */
  initialComponents?: ProductComponent[] | null;
  /** Панель редактирования с публичного сайта (роль + режим «Редактировать публичный сайт») */
  publicToolbar?: ProductComponentsPublicToolbar;
  /** Черновики строк при `publicToolbar.isEditing` */
  draftRows?: PublicComponentDraftRow[] | null;
  onDraftRowChange?: (id: string, field: 'name' | 'type' | 'price', value: string) => void;
}

export const ProductComponents: React.FC<ProductComponentsProps> = ({
  productId,
  initialComponents,
  publicToolbar,
  draftRows,
  onDraftRowChange,
}) => {
  const { cart, addComponentToCart, updateComponentQuantity, removeComponentFromCart } = useCart();
  const [components, setComponents] = useState<ProductComponent[]>(initialComponents ?? []);
  const [loading, setLoading] = useState(typeof initialComponents === 'undefined');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof initialComponents !== 'undefined') {
      setComponents(initialComponents ?? []);
      setLoading(false);
      const initialQuantities: Record<string, number> = {};
      (initialComponents ?? []).forEach((comp) => {
        initialQuantities[comp.id] = 1;
      });
      setQuantities(initialQuantities);
      return;
    }

    const fetchComponents = async () => {
      try {
        setLoading(true);
        const data = await getProductComponents(productId);
        setComponents(data);
        const initialQuantities: Record<string, number> = {};
        data.forEach((comp) => {
          initialQuantities[comp.id] = 1;
        });
        setQuantities(initialQuantities);
      } catch {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };

    fetchComponents();
  }, [productId, initialComponents]);

  // «Стойка коробки» продаётся половинками (шаг 0,5), остальные — целыми
  const getQuantityStep = (component: ProductComponent): number =>
    /стойка\s+коробки/i.test(component.name) ||
    /стойка\s+коробки/i.test(component.type) ||
    (component.name === 'Коробка' && !/стойки/i.test(component.type))
      ? 0.5
      : 1;

  const getMinQuantity = (component: ProductComponent): number =>
    getQuantityStep(component) === 0.5 ? 0.5 : 1;

  const handleQuantityChange = (componentId: string, delta: number, step: number) => {
    setQuantities((prev) => {
      const current = prev[componentId] ?? (step === 0.5 ? 1 : 1);
      const minQty = step === 0.5 ? 0.5 : 1;
      const raw = current + delta * step;
      const newQuantity = Math.round(raw * 2) / 2; // округление до 0,5
      const clamped = Math.max(minQty, newQuantity);
      return { ...prev, [componentId]: clamped };
    });
  };

  const handleAddToCart = async (component: ProductComponent) => {
    try {
      setAddingToCart((prev) => ({ ...prev, [component.id]: true }));
      await addComponentToCart(component.id, quantities[component.id] || 1);
    } catch (error) {
      if (isAuthRequiredForCartError(error)) {
        return;
      }
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert('Произошла ошибка при добавлении комплектующего в корзину');
      }
    } finally {
      setAddingToCart((prev) => ({ ...prev, [component.id]: false }));
    }
  };

  if (loading) {
    return null;
  }

  // Если комплектующих нет, не показываем раздел вообще
  if (components.length === 0) {
    return null;
  }

  const isPublicEditing = Boolean(publicToolbar?.isEditing && draftRows?.length);

  const titleBlock = publicToolbar?.show ? (
    <div className={styles.componentsHeader}>
      <h2 className={`${styles.componentsTitle} ${styles.componentsTitleBar}`}>Комплектующие</h2>
      <div className={pageStyles.publicEditToolbarActions}>
        {!publicToolbar.isEditing ? (
          <button
            type="button"
            className={pageStyles.attributesEditBtn}
            onClick={publicToolbar.onStartEdit}
            title="Редактировать комплектующие"
            aria-label="Редактировать комплектующие"
          >
            <PencilSquareIcon className={pageStyles.attributesEditIcon} aria-hidden />
          </button>
        ) : (
          <>
            <button
              type="button"
              className={pageStyles.attributesCancelBtn}
              onClick={publicToolbar.onCancel}
              disabled={publicToolbar.saving}
              title="Закрыть без сохранения"
              aria-label="Закрыть без сохранения"
            >
              <XMarkIcon className={pageStyles.attributesCancelIcon} aria-hidden />
            </button>
            <button
              type="button"
              className={pageStyles.attributesSaveBtn}
              onClick={() => void publicToolbar.onSave()}
              disabled={publicToolbar.saving || !publicToolbar.canSave}
              title={publicToolbar.saving ? 'Сохранение...' : 'Сохранить'}
              aria-label={publicToolbar.saving ? 'Сохранение...' : 'Сохранить'}
            >
              <CheckIcon className={pageStyles.attributesSaveIcon} aria-hidden />
            </button>
          </>
        )}
      </div>
    </div>
  ) : (
    <h2 className={styles.componentsTitle}>Комплектующие</h2>
  );

  return (
    <div className={styles.componentsSection}>
      {titleBlock}
      <div className={styles.componentsList}>
        {components.map((component) => {
          const draft =
            isPublicEditing && draftRows ? draftRows.find((d) => d.id === component.id) : undefined;
          const displayName = draft?.name ?? component.name;
          const displayType = draft?.type ?? component.type;
          const displayPriceStr = draft?.price ?? String(component.price);
          const price = parseFloat(displayPriceStr.replace(/\s/g, '').replace(',', '.')) || 0;

          const step = getQuantityStep({
            ...component,
            name: displayName,
            type: displayType,
          });
          const minQty = getMinQuantity({
            ...component,
            name: displayName,
            type: displayType,
          });
          const quantity = quantities[component.id] ?? (step === 0.5 ? 1 : 1);
          const isAdding = addingToCart[component.id] || false;
          const formatQty = (q: number) => (step === 0.5 && q % 1 !== 0 ? q.toFixed(1) : String(q));

          return (
            <div key={component.id} className={styles.componentItem}>
              <div className={styles.componentLeft}>
                {component.image && (
                  <div className={styles.componentImage}>
                    <img src={component.image} alt={displayType} />
                  </div>
                )}
                <div className={styles.componentInfo}>
                  {isPublicEditing && draft && onDraftRowChange ? (
                    <>
                      <input
                        type="text"
                        className={styles.componentEditInput}
                        value={draft.name}
                        onChange={(e) => onDraftRowChange(component.id, 'name', e.target.value)}
                        aria-label="Наименование комплектующего"
                      />
                      <input
                        type="text"
                        className={styles.componentEditInputSecondary}
                        value={draft.type}
                        onChange={(e) => onDraftRowChange(component.id, 'type', e.target.value)}
                        aria-label="Тип комплектующего"
                      />
                    </>
                  ) : (
                    <>
                      <span className={styles.componentName}>{component.name}</span>
                      <span className={styles.componentType}>{component.type}</span>
                    </>
                  )}
                </div>
              </div>
              <div className={styles.componentRight}>
                {isPublicEditing && draft && onDraftRowChange ? (
                  <div className={styles.componentEditPriceWrap}>
                    <input
                      type="text"
                      inputMode="decimal"
                      className={styles.componentEditPrice}
                      value={draft.price}
                      onChange={(e) => onDraftRowChange(component.id, 'price', e.target.value)}
                      aria-label="Цена за штуку"
                    />
                    <span className={styles.componentPriceSuffix}>₽ / шт.</span>
                  </div>
                ) : (
                  <span className={styles.componentPrice}>{price.toLocaleString()} ₽ / шт.</span>
                )}
                <div className={styles.componentActions}>
                  {!isPublicEditing &&
                    (() => {
                      const cartItem = cart.find(
                        (item) =>
                          item.componentId !== null &&
                          item.productId === null &&
                          String(item.componentId) === String(component.id)
                      );
                      const cartQuantity = cartItem ? Number(cartItem.quantity) : 0;
                      const isInCart = cartQuantity > 0;

                      if (isInCart) {
                        const cartStep = getQuantityStep(component);
                        const cartMin = getMinQuantity(component);
                        const cartQtyNum = Number(cartQuantity);
                        return (
                          <div className={styles.cartControls}>
                            <span className={styles.inCartLabel}>В корзине</span>
                            <div
                              className={styles.quantityControls}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                type="button"
                                className={styles.quantityButton}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isAdding) return;
                                  try {
                                    const newQuantity = Math.round((cartQtyNum - cartStep) * 2) / 2;
                                    if (newQuantity < cartMin) {
                                      await removeComponentFromCart(component.id);
                                      return;
                                    }
                                    await updateComponentQuantity(component.id, newQuantity);
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
                                disabled={isAdding}
                              >
                                −
                              </button>
                              <span className={styles.quantityValue}>
                                {cartStep === 0.5 && cartQtyNum % 1 !== 0
                                  ? cartQtyNum.toFixed(1)
                                  : cartQuantity}
                              </span>
                              <button
                                type="button"
                                className={styles.quantityButton}
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (isAdding) return;
                                  try {
                                    const newQuantity = Math.round((cartQtyNum + cartStep) * 2) / 2;
                                    await updateComponentQuantity(component.id, newQuantity);
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
                                disabled={isAdding}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <>
                          <div className={styles.quantitySelector}>
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleQuantityChange(component.id, -1, step)}
                              disabled={quantity <= minQty}
                            >
                              −
                            </button>
                            <span className={styles.quantityValue}>{formatQty(quantity)}</span>
                            <button
                              type="button"
                              className={styles.quantityButton}
                              onClick={() => handleQuantityChange(component.id, 1, step)}
                            >
                              +
                            </button>
                          </div>
                          <button
                            type="button"
                            className={styles.addToCartButton}
                            onClick={() => handleAddToCart(component)}
                            disabled={isAdding}
                          >
                            {isAdding ? 'Добавление...' : 'В корзину'}
                          </button>
                        </>
                      );
                    })()}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
