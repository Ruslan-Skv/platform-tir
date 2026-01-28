'use client';

import React, { useEffect, useState } from 'react';

import { type ProductComponent, getProductComponents } from '@/shared/api/product-components';
import { useCart } from '@/shared/lib/hooks';

import styles from './ProductComponents.module.css';

interface ProductComponentsProps {
  productId: string;
  /** Переданные с родителя комплектующие — используются вместо отдельного запроса */
  initialComponents?: ProductComponent[] | null;
}

export const ProductComponents: React.FC<ProductComponentsProps> = ({
  productId,
  initialComponents,
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
      } catch (error) {
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

  // Группируем комплектующие по наименованию
  const groupedComponents = components.reduce(
    (acc, comp) => {
      if (!acc[comp.name]) {
        acc[comp.name] = [];
      }
      acc[comp.name].push(comp);
      return acc;
    },
    {} as Record<string, ProductComponent[]>
  );

  return (
    <div className={styles.componentsSection}>
      <h2 className={styles.componentsTitle}>Комплектующие</h2>
      <div className={styles.componentsList}>
        {components.map((component) => {
          const price = parseFloat(component.price);
          const step = getQuantityStep(component);
          const minQty = getMinQuantity(component);
          const quantity = quantities[component.id] ?? (step === 0.5 ? 1 : 1);
          const isAdding = addingToCart[component.id] || false;
          const formatQty = (q: number) => (step === 0.5 && q % 1 !== 0 ? q.toFixed(1) : String(q));

          return (
            <div key={component.id} className={styles.componentItem}>
              {component.image && (
                <div className={styles.componentImage}>
                  <img src={component.image} alt={component.type} />
                </div>
              )}
              <div className={styles.componentInfo}>
                <div className={styles.componentInfoRow}>
                  <span className={styles.componentName}>{component.name}</span>
                  <span className={styles.componentType}>{component.type}</span>
                  <span className={styles.componentPrice}>{price.toLocaleString()} ₽ / шт.</span>
                </div>
              </div>
              <div className={styles.componentActions}>
                {(() => {
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
          );
        })}
      </div>
    </div>
  );
};
