'use client';

import React, { useEffect, useState } from 'react';

import { type ProductComponent, getProductComponents } from '@/shared/api/product-components';
import { useCart } from '@/shared/lib/hooks';

import styles from './ProductComponents.module.css';

interface ProductComponentsProps {
  productId: string;
}

export const ProductComponents: React.FC<ProductComponentsProps> = ({ productId }) => {
  const { cart, addComponentToCart, updateComponentQuantity } = useCart();
  const [components, setComponents] = useState<ProductComponent[]>([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchComponents = async () => {
      try {
        setLoading(true);
        const data = await getProductComponents(productId);
        setComponents(data);
        // Инициализируем количества
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
  }, [productId]);

  const handleQuantityChange = (componentId: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[componentId] || 1;
      const newQuantity = Math.max(1, current + delta);
      return { ...prev, [componentId]: newQuantity };
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
          const quantity = quantities[component.id] || 1;
          const isAdding = addingToCart[component.id] || false;

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
                                const newQuantity = Number(cartQuantity) - 1;
                                if (newQuantity < 0) return;
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
                          <span className={styles.quantityValue}>{cartQuantity}</span>
                          <button
                            type="button"
                            className={styles.quantityButton}
                            onClick={async (e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (isAdding) return;
                              try {
                                const newQuantity = Number(cartQuantity) + 1;
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
                          onClick={() => handleQuantityChange(component.id, -1)}
                          disabled={quantity <= 1}
                        >
                          −
                        </button>
                        <span className={styles.quantityValue}>{quantity}</span>
                        <button
                          type="button"
                          className={styles.quantityButton}
                          onClick={() => handleQuantityChange(component.id, 1)}
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
