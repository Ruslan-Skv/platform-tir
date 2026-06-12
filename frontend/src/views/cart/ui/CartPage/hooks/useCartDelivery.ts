'use client';

import { useCallback, useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';

import {
  type CalculateDeliveryResult,
  type DeliveryAddressForm,
  type DeliverySettlementOption,
  type DeliveryType,
  type UserOrder,
  calculateDelivery,
  getDeliverySettlements,
} from '@/shared/api/user-orders';

export type CartDeliveryFormState = {
  street: string;
  city: string;
  distanceKm: string;
  deliveryType: DeliveryType;
  deliveryFloor: string;
  deliveryHasElevator: boolean;
  preferredDeliveryTime: string;
};

const EMPTY_DELIVERY_FORM: CartDeliveryFormState = {
  street: '',
  city: '',
  distanceKm: '',
  deliveryType: 'TO_ENTRANCE',
  deliveryFloor: '',
  deliveryHasElevator: false,
  preferredDeliveryTime: '',
};

type UseCartDeliveryParams = {
  orderWithDelivery: UserOrder | null;
  subtotal: number;
};

export function useCartDelivery({ orderWithDelivery, subtotal }: UseCartDeliveryParams) {
  const [wantDelivery, setWantDelivery] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState<CartDeliveryFormState>(EMPTY_DELIVERY_FORM);
  const [calculatedDelivery, setCalculatedDelivery] = useState<CalculateDeliveryResult | null>(
    null
  );
  const [deliveryCalculationLoading, setDeliveryCalculationLoading] = useState(false);
  const [deliveryCalculationError, setDeliveryCalculationError] = useState<string | null>(null);
  const [deliverySettlements, setDeliverySettlements] = useState<DeliverySettlementOption[]>([]);
  const [deliveryPaymentMode, setDeliveryPaymentMode] = useState<'WITH_ORDER' | 'ON_SITE'>(
    'WITH_ORDER'
  );

  useEffect(() => {
    getDeliverySettlements()
      .then((data) => {
        setDeliverySettlements(data.settlements ?? []);
        setDeliveryPaymentMode(data.deliveryPaymentMode ?? 'WITH_ORDER');
      })
      .catch(() => setDeliverySettlements([]));
  }, []);

  useEffect(() => {
    if (!orderWithDelivery) return;
    setWantDelivery(true);
    const addr = orderWithDelivery.shippingAddress;
    setDeliveryForm((f) => ({
      ...f,
      street: addr?.street ?? '',
      city: addr?.city ?? '',
      deliveryType:
        orderWithDelivery.deliveryType === 'TO_APARTMENT' ? 'TO_APARTMENT' : 'TO_ENTRANCE',
      deliveryFloor:
        orderWithDelivery.deliveryFloor != null ? String(orderWithDelivery.deliveryFloor) : '',
      deliveryHasElevator: orderWithDelivery.deliveryHasElevator ?? false,
      preferredDeliveryTime: orderWithDelivery.preferredDeliveryTime ?? '',
    }));
  }, [orderWithDelivery]);

  const deliveryFormValidForCalculation =
    wantDelivery &&
    deliveryForm.street.trim() !== '' &&
    deliveryForm.city.trim() !== '' &&
    deliveryForm.city !== '__OTHER__';

  const deliveryFormValid =
    deliveryFormValidForCalculation &&
    (deliveryForm.deliveryType === 'TO_ENTRANCE' ||
      (deliveryForm.deliveryType === 'TO_APARTMENT' &&
        deliveryForm.deliveryFloor.trim() !== '' &&
        parseInt(deliveryForm.deliveryFloor, 10) >= 1));

  useEffect(() => {
    if (!wantDelivery || !deliveryFormValidForCalculation) {
      setCalculatedDelivery(null);
      setDeliveryCalculationError(null);
      return;
    }
    const floorNum =
      deliveryForm.deliveryType === 'TO_APARTMENT' && deliveryForm.deliveryFloor.trim() !== ''
        ? parseInt(deliveryForm.deliveryFloor, 10)
        : undefined;
    const distanceKmNum =
      deliveryForm.distanceKm.trim() !== '' ? parseFloat(deliveryForm.distanceKm) : undefined;
    let cancelled = false;
    setDeliveryCalculationLoading(true);
    setDeliveryCalculationError(null);
    calculateDelivery({
      subtotal,
      city: deliveryForm.city.trim(),
      distanceKm: distanceKmNum != null && !isNaN(distanceKmNum) ? distanceKmNum : undefined,
      deliveryType: deliveryForm.deliveryType,
      deliveryFloor: floorNum,
      deliveryHasElevator:
        deliveryForm.deliveryType === 'TO_APARTMENT' ? deliveryForm.deliveryHasElevator : undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setCalculatedDelivery(res);
          setDeliveryCalculationError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setCalculatedDelivery(null);
          setDeliveryCalculationError(
            err instanceof Error ? err.message : 'Не удалось рассчитать доставку'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setDeliveryCalculationLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    wantDelivery,
    deliveryFormValidForCalculation,
    subtotal,
    deliveryForm.city,
    deliveryForm.distanceKm,
    deliveryForm.deliveryType,
    deliveryForm.deliveryFloor,
    deliveryForm.deliveryHasElevator,
  ]);

  const buildDeliveryPayload = useCallback((): {
    deliveryAddress: DeliveryAddressForm;
    deliveryType: DeliveryType;
    deliveryFloor?: number;
    deliveryHasElevator?: boolean;
    distanceKm?: number;
    preferredDeliveryTime?: string;
  } | null => {
    if (!wantDelivery || !deliveryFormValid || !calculatedDelivery) return null;
    const payload = {
      deliveryAddress: {
        street: deliveryForm.street.trim(),
        city: deliveryForm.city.trim(),
      },
      deliveryType: deliveryForm.deliveryType,
    } as {
      deliveryAddress: DeliveryAddressForm;
      deliveryType: DeliveryType;
      deliveryFloor?: number;
      deliveryHasElevator?: boolean;
      distanceKm?: number;
      preferredDeliveryTime?: string;
    };
    if (deliveryForm.deliveryType === 'TO_APARTMENT') {
      const floor = parseInt(deliveryForm.deliveryFloor, 10);
      if (!isNaN(floor) && floor >= 1) {
        payload.deliveryFloor = floor;
        payload.deliveryHasElevator = deliveryForm.deliveryHasElevator;
      }
    }
    if (deliveryForm.preferredDeliveryTime.trim()) {
      payload.preferredDeliveryTime = deliveryForm.preferredDeliveryTime.trim();
    }
    const dist = parseFloat(deliveryForm.distanceKm);
    if (deliveryForm.distanceKm.trim() !== '' && !isNaN(dist) && dist >= 0) {
      payload.distanceKm = dist;
    }
    return payload;
  }, [wantDelivery, deliveryFormValid, calculatedDelivery, deliveryForm]);

  const handleDeliveryCheckboxChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.checked) {
      setWantDelivery(false);
      return;
    }
    setWantDelivery(true);
  };

  return {
    wantDelivery,
    setWantDelivery,
    deliveryForm,
    setDeliveryForm,
    calculatedDelivery,
    deliveryCalculationLoading,
    deliveryCalculationError,
    deliverySettlements,
    deliveryPaymentMode,
    deliveryFormValid,
    deliveryFormValidForCalculation,
    buildDeliveryPayload,
    handleDeliveryCheckboxChange,
  };
}
