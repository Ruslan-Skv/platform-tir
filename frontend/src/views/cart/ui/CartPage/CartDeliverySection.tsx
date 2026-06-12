'use client';

import { TrashIcon, TruckIcon } from '@heroicons/react/24/outline';

import type { ChangeEvent, Dispatch, SetStateAction } from 'react';

import Link from 'next/link';

import type {
  CalculateDeliveryResult,
  DeliverySettlementOption,
  UserOrder,
} from '@/shared/api/user-orders';
import type { CartSectionId } from '@/views/cart/lib/build-cart-sections';

import { ApprovedOrderBadge, ReviewInProgressBadge } from './CartItemStatusIcons';
import styles from './CartPage.module.css';

type DeliveryFormState = {
  street: string;
  city: string;
  distanceKm: string;
  deliveryType: 'TO_ENTRANCE' | 'TO_APARTMENT';
  deliveryFloor: string;
  deliveryHasElevator: boolean;
  preferredDeliveryTime: string;
};

type CartDeliverySectionProps = {
  sectionId: CartSectionId;
  wantDelivery: boolean;
  orderWithDelivery: UserOrder | null;
  handleDeliveryCheckboxChange: (e: ChangeEvent<HTMLInputElement>) => void;
  deliveryForm: DeliveryFormState;
  setDeliveryForm: Dispatch<SetStateAction<DeliveryFormState>>;
  deliveryPaymentMode: 'WITH_ORDER' | 'ON_SITE';
  deliverySettlements: DeliverySettlementOption[];
  deliveryFormValid: boolean;
  deliveryCalculationLoading: boolean;
  deliveryCalculationError: string | null;
  calculatedDelivery: CalculateDeliveryResult | null;
  pendingOrderHasDelivery: boolean;
  returnedOrderHasDelivery: boolean;
  approvedOrderHasDelivery: boolean;
  approvedOrder: UserOrder | null;
  approvalRemainingMs: number;
};

export function CartDeliverySection({
  sectionId,
  wantDelivery,
  orderWithDelivery,
  handleDeliveryCheckboxChange,
  deliveryForm,
  setDeliveryForm,
  deliveryPaymentMode,
  deliverySettlements,
  deliveryFormValid,
  deliveryCalculationLoading,
  deliveryCalculationError,
  calculatedDelivery,
  pendingOrderHasDelivery,
  returnedOrderHasDelivery,
  approvedOrderHasDelivery,
  approvedOrder,
  approvalRemainingMs,
}: CartDeliverySectionProps) {
  const showCheckbox = sectionId === 'section1' && !orderWithDelivery;
  const showForm = sectionId === 'section1' && wantDelivery && !orderWithDelivery;
  const showCompact =
    (sectionId === 'section2' &&
      (pendingOrderHasDelivery || returnedOrderHasDelivery) &&
      orderWithDelivery) ||
    (sectionId === 'section3' && approvedOrderHasDelivery && orderWithDelivery);

  if (!showCheckbox && !showForm && !showCompact) {
    return null;
  }

  return (
    <>
      {showCheckbox && (
        <div className={styles.deliveryCheckboxWrap}>
          <label className={styles.deliveryCheckboxLabel}>
            <input
              type="checkbox"
              checked={wantDelivery}
              onChange={handleDeliveryCheckboxChange}
              className={styles.deliveryCheckbox}
            />
            <span>Оформить доставку</span>
          </label>
          <p className={styles.deliveryCheckboxHint}>
            Заполните адрес и условия доставки — они отправятся на проверку вместе с заказом по
            кнопке «Отправить на проверку».
          </p>
        </div>
      )}

      {showForm && (
        <div className={styles.deliveryFormBlock}>
          <div className={styles.deliveryFormTitleRow}>
            <h3 className={styles.deliveryFormTitle}>Адрес и условия доставки</h3>
            {deliveryPaymentMode === 'ON_SITE' && (
              <p className={styles.deliveryFormPaymentNote}>
                Оплата доставки не включается в стоимость заказа, а производится водителю после
                доставки товара.
              </p>
            )}
          </div>
          <div className={styles.deliveryFormGrid}>
            <div className={styles.deliveryFormField}>
              <label htmlFor={`delivery-street-${sectionId}`}>Улица, дом, квартира *</label>
              <input
                id={`delivery-street-${sectionId}`}
                type="text"
                value={deliveryForm.street}
                onChange={(e) => setDeliveryForm((f) => ({ ...f, street: e.target.value }))}
                placeholder="ул. Примерная, д. 1, кв. 1"
              />
            </div>
            <div className={styles.deliveryFormField}>
              <label htmlFor={`delivery-city-${sectionId}`}>Город *</label>
              {deliverySettlements.length > 0 ? (
                <>
                  <select
                    id={`delivery-city-${sectionId}`}
                    value={
                      deliveryForm.city === '__OTHER__' ||
                      (deliveryForm.city.trim() !== '' &&
                        !deliverySettlements.some(
                          (s) =>
                            s.name.trim().toLowerCase() === deliveryForm.city.trim().toLowerCase()
                        ))
                        ? '__OTHER__'
                        : deliverySettlements.some(
                              (s) =>
                                s.name.trim().toLowerCase() ===
                                deliveryForm.city.trim().toLowerCase()
                            )
                          ? deliveryForm.city.trim()
                          : '__SELECT__'
                    }
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === '__SELECT__') {
                        setDeliveryForm((f) => ({ ...f, city: '', distanceKm: '' }));
                      } else if (v === '__OTHER__') {
                        setDeliveryForm((f) => ({
                          ...f,
                          city: '__OTHER__',
                          distanceKm: f.distanceKm,
                        }));
                      } else {
                        setDeliveryForm((f) => ({ ...f, city: v, distanceKm: '' }));
                      }
                    }}
                  >
                    <option value="__SELECT__">Выберите город</option>
                    {deliverySettlements.map((s) => (
                      <option key={s.name} value={s.name}>
                        {s.name} — {s.price.toLocaleString()} ₽
                      </option>
                    ))}
                    <option value="__OTHER__">Другой населённый пункт</option>
                  </select>
                  {(deliveryForm.city === '__OTHER__' ||
                    (deliveryForm.city.trim() !== '' &&
                      !deliverySettlements.some(
                        (s) =>
                          s.name.trim().toLowerCase() === deliveryForm.city.trim().toLowerCase()
                      ))) && (
                    <input
                      type="text"
                      className={styles.deliveryFormOtherCity}
                      value={deliveryForm.city === '__OTHER__' ? '' : deliveryForm.city}
                      onChange={(e) => setDeliveryForm((f) => ({ ...f, city: e.target.value }))}
                      placeholder="Укажите населённый пункт"
                    />
                  )}
                </>
              ) : (
                <input
                  id={`delivery-city-${sectionId}`}
                  type="text"
                  value={deliveryForm.city}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Мурманск"
                />
              )}
            </div>
            {(deliverySettlements.length > 0
              ? (deliveryForm.city === '__OTHER__' ||
                  (deliveryForm.city.trim() !== '' &&
                    !deliverySettlements.some(
                      (s) => s.name.trim().toLowerCase() === deliveryForm.city.trim().toLowerCase()
                    ))) &&
                deliveryForm.city !== '__OTHER__'
              : deliveryForm.city.trim() &&
                !deliveryForm.city.trim().toLowerCase().includes('мурманск')) && (
              <div className={styles.deliveryFormField}>
                <label htmlFor={`delivery-distance-${sectionId}`}>
                  Расстояние от Мурманска, км
                </label>
                <input
                  id={`delivery-distance-${sectionId}`}
                  type="number"
                  min={0}
                  step={1}
                  value={deliveryForm.distanceKm}
                  onChange={(e) => setDeliveryForm((f) => ({ ...f, distanceKm: e.target.value }))}
                  placeholder="0"
                />
              </div>
            )}
          </div>
          <div className={styles.deliveryFormRadios}>
            <label className={styles.deliveryRadioLabel}>
              <input
                type="radio"
                name="deliveryType"
                checked={deliveryForm.deliveryType === 'TO_ENTRANCE'}
                onChange={() => setDeliveryForm((f) => ({ ...f, deliveryType: 'TO_ENTRANCE' }))}
              />
              <span>Доставка до подъезда</span>
            </label>
            <label className={styles.deliveryRadioLabel}>
              <input
                type="radio"
                name="deliveryType"
                checked={deliveryForm.deliveryType === 'TO_APARTMENT'}
                onChange={() => setDeliveryForm((f) => ({ ...f, deliveryType: 'TO_APARTMENT' }))}
              />
              <span>Доставка до квартиры</span>
            </label>
          </div>
          {deliveryForm.deliveryType === 'TO_APARTMENT' && (
            <div className={styles.deliveryFormLift}>
              <div className={styles.deliveryFormField}>
                <label htmlFor={`delivery-floor-${sectionId}`}>Этаж *</label>
                <input
                  id={`delivery-floor-${sectionId}`}
                  type="number"
                  min={1}
                  value={deliveryForm.deliveryFloor}
                  onChange={(e) =>
                    setDeliveryForm((f) => ({ ...f, deliveryFloor: e.target.value }))
                  }
                  placeholder="1"
                />
              </div>
              <label className={styles.deliveryFormCheckbox}>
                <input
                  type="checkbox"
                  checked={deliveryForm.deliveryHasElevator}
                  onChange={(e) =>
                    setDeliveryForm((f) => ({
                      ...f,
                      deliveryHasElevator: e.target.checked,
                    }))
                  }
                />
                <span>Есть лифт</span>
              </label>
              <p className={styles.deliveryFormMoversNote}>
                Стоимость работы одного грузчика производится из расчёта = 1000 руб/час.
              </p>
            </div>
          )}
          <div className={`${styles.deliveryFormField} ${styles.deliveryFormDateField}`}>
            <label htmlFor={`delivery-preferred-date-${sectionId}`}>
              Выберите удобный для вас день для осуществления доставки (мы постараемся организовать
              доставку в выбранный вами день)
            </label>
            <input
              id={`delivery-preferred-date-${sectionId}`}
              type="date"
              value={
                /^\d{4}-\d{2}-\d{2}$/.test(deliveryForm.preferredDeliveryTime)
                  ? deliveryForm.preferredDeliveryTime
                  : ''
              }
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) =>
                setDeliveryForm((f) => ({
                  ...f,
                  preferredDeliveryTime: e.target.value,
                }))
              }
            />
          </div>
          {deliveryFormValid && (
            <div className={styles.deliveryFormTotal}>
              {deliveryCalculationLoading && (
                <div className={styles.deliveryCostLine}>
                  <span className={styles.deliveryCostLabel}>Стоимость доставки:</span>
                  <span className={styles.deliveryCostLoading}>Рассчитываем…</span>
                </div>
              )}
              {!deliveryCalculationLoading && deliveryCalculationError && (
                <div className={styles.deliveryCostLine}>
                  <span className={styles.deliveryCostError}>{deliveryCalculationError}</span>
                </div>
              )}
              {!deliveryCalculationLoading && calculatedDelivery && !deliveryCalculationError && (
                <div className={styles.deliveryCostLine}>
                  <span className={styles.deliveryCostLabel}>Предварительный расчёт доставки:</span>
                  <strong className={styles.deliveryCostValue}>
                    {calculatedDelivery.totalShippingCost.toLocaleString()} ₽
                  </strong>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showCompact && orderWithDelivery && (
        <div className={styles.deliveryCompactWrap}>
          <div className={styles.deliveryCompactRow}>
            <div className={styles.deliveryCompactIcon} aria-hidden>
              <TruckIcon className={styles.deliveryCompactIconSvg} />
            </div>
            <div className={styles.deliveryCompactInfo}>
              <span className={styles.deliveryCompactTitle}>
                Доставка
                {deliveryPaymentMode === 'ON_SITE' && (
                  <span className={styles.deliveryPayOnSiteBadge} role="status">
                    Оплатить водителю!
                  </span>
                )}
              </span>
              <span className={styles.deliveryCompactDetails}>
                {[
                  orderWithDelivery.shippingAddress?.street,
                  orderWithDelivery.shippingAddress?.city,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Адрес указан'}
                {' · '}
                {orderWithDelivery.deliveryType === 'TO_APARTMENT' ? 'до квартиры' : 'до подъезда'}
                {orderWithDelivery.deliveryType === 'TO_APARTMENT' &&
                  orderWithDelivery.deliveryFloor != null &&
                  `, ${orderWithDelivery.deliveryFloor} этаж`}
              </span>
              {(Number(orderWithDelivery.shippingCost ?? 0) > 0 ||
                Number(orderWithDelivery.carryCost ?? 0) > 0) && (
                <div className={styles.deliveryCompactCostBreakdown}>
                  <div className={styles.deliveryCompactCostLine}>
                    <span>
                      Доставка:{' '}
                      {(Number(orderWithDelivery.shippingCost) || 0).toLocaleString('ru-RU')} ₽
                    </span>
                    {orderWithDelivery.carryCost != null &&
                      Number(orderWithDelivery.carryCost) > 0 && (
                        <span>
                          {orderWithDelivery.moversCount != null &&
                          orderWithDelivery.moversCount > 0
                            ? `${orderWithDelivery.moversCount} грузчик${orderWithDelivery.moversCount === 1 ? '' : orderWithDelivery.moversCount < 5 ? 'а' : 'ов'}: `
                            : 'Грузчики: '}
                          {Number(orderWithDelivery.carryCost).toLocaleString('ru-RU')} ₽
                        </span>
                      )}
                  </div>
                  <span className={styles.deliveryCompactCostTotal}>
                    Итого стоимость доставки:{' '}
                    {(
                      Number(orderWithDelivery.shippingCost ?? 0) +
                      Number(orderWithDelivery.carryCost ?? 0)
                    ).toLocaleString('ru-RU')}{' '}
                    ₽
                  </span>
                </div>
              )}
              {orderWithDelivery.plannedDeliveryDate && (
                <span className={styles.deliveryCompactDate}>
                  Дата доставки:{' '}
                  {new Date(orderWithDelivery.plannedDeliveryDate).toLocaleDateString('ru-RU')}
                </span>
              )}
            </div>
            <div className={styles.itemActionsColumn}>
              {orderWithDelivery.adminEditedAt && (
                <span className={styles.deliveryEditedBadge} role="status">
                  Изменено!
                </span>
              )}
              {pendingOrderHasDelivery ? (
                <ReviewInProgressBadge />
              ) : (
                <>
                  <ApprovedOrderBadge />
                  {approvedOrder && approvalRemainingMs > 0 && (
                    <Link
                      href={`/checkout?orderId=${approvedOrder.id}`}
                      className={styles.deliveryBasketButton}
                      title="Корзинка — перейти к оформлению"
                      aria-label="Корзинка — перейти к оформлению"
                    >
                      <TrashIcon className={styles.deliveryBasketButtonIcon} />
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
