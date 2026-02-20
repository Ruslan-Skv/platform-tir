'use client';

import React, { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import {
  type SubmitFromCartForCustomerDto,
  submitOrderFromCartForCustomer,
} from '@/shared/api/admin-orders';
import * as cartApi from '@/shared/api/cart';
import type { CartItem } from '@/shared/api/cart';
import {
  type DeliveryType,
  calculateDelivery,
  getDeliverySettlements,
  getShippingMethods,
} from '@/shared/api/user-orders';

export default function CreateOrderForCustomerPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitInProgress, setSubmitInProgress] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    customerEmail: '',
    customerFirstName: '',
    customerLastName: '',
    wantDelivery: false,
    street: '',
    city: '',
    distanceKm: '',
    deliveryType: 'TO_ENTRANCE' as DeliveryType,
    deliveryFloor: '',
    deliveryHasElevator: false,
    preferredDeliveryTime: '',
  });
  const [calculatedDelivery, setCalculatedDelivery] = useState<{
    deliveryCost: number;
    carryCost: number;
    totalShippingCost: number;
  } | null>(null);
  const [deliveryCalcLoading, setDeliveryCalcLoading] = useState(false);
  const [settlements, setSettlements] = useState<{ name: string; price: number }[]>([]);
  const [shippingMethods, setShippingMethods] = useState<
    Array<{ id: string; name: string; price: number }>
  >([]);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await cartApi.getCart();
      setCart(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки корзины');
      setCart([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useEffect(() => {
    getDeliverySettlements()
      .then((r) => setSettlements(r.settlements ?? []))
      .catch(() => setSettlements([]));
    getShippingMethods()
      .then((r) =>
        setShippingMethods(r.map((m) => ({ id: m.id, name: m.name, price: Number(m.price) })))
      )
      .catch(() => setShippingMethods([]));
  }, []);

  const subtotal = cart.reduce((sum, item) => {
    const price = item.product?.price ?? item.cardVariant?.price ?? item.component?.price ?? 0;
    return sum + Number(price) * Number(item.quantity);
  }, 0);

  const recalcDelivery = useCallback(async () => {
    if (!form.city.trim()) {
      setCalculatedDelivery(null);
      return;
    }
    setDeliveryCalcLoading(true);
    try {
      const r = await calculateDelivery({
        subtotal,
        city: form.city.trim(),
        distanceKm: form.distanceKm ? parseFloat(form.distanceKm) : undefined,
        deliveryType: form.deliveryType,
        deliveryFloor: form.deliveryFloor ? parseInt(form.deliveryFloor, 10) : undefined,
        deliveryHasElevator: form.deliveryHasElevator,
      });
      setCalculatedDelivery(r);
    } catch {
      setCalculatedDelivery(null);
    } finally {
      setDeliveryCalcLoading(false);
    }
  }, [
    form.city,
    form.distanceKm,
    form.deliveryType,
    form.deliveryFloor,
    form.deliveryHasElevator,
    subtotal,
  ]);

  useEffect(() => {
    if (form.wantDelivery && form.city.trim()) {
      recalcDelivery();
    } else {
      setCalculatedDelivery(null);
    }
  }, [
    form.wantDelivery,
    form.city,
    form.distanceKm,
    form.deliveryType,
    form.deliveryFloor,
    form.deliveryHasElevator,
    recalcDelivery,
  ]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!form.customerEmail.trim()) {
      setError('Укажите email покупателя');
      return;
    }
    if (cart.length === 0) {
      setError('Корзина пуста. Добавьте товары из каталога.');
      return;
    }
    setSubmitInProgress(true);
    try {
      const dto: SubmitFromCartForCustomerDto = {
        customerEmail: form.customerEmail.trim(),
        customerFirstName: form.customerFirstName.trim() || undefined,
        customerLastName: form.customerLastName.trim() || undefined,
      };
      if (form.wantDelivery && form.city.trim()) {
        dto.deliveryAddress = {
          street: form.street.trim(),
          city: form.city.trim(),
        };
        dto.deliveryType = form.deliveryType;
        dto.deliveryFloor = form.deliveryFloor ? parseInt(form.deliveryFloor, 10) : undefined;
        dto.deliveryHasElevator = form.deliveryHasElevator;
        dto.distanceKm = form.distanceKm ? parseFloat(form.distanceKm) : undefined;
        dto.preferredDeliveryTime = form.preferredDeliveryTime.trim() || undefined;
      } else if (shippingMethods.length > 0) {
        dto.shippingMethodId = shippingMethods[0].id;
      }
      await submitOrderFromCartForCustomer(dto);
      setSuccess(
        'Заказ создан и отправлен на проверку. После проверки нажмите «Отправить на email» в карточке заказа.'
      );
      setForm((f) => ({ ...f, customerEmail: '', customerFirstName: '', customerLastName: '' }));
      await loadCart();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка при оформлении');
    } finally {
      setSubmitInProgress(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <p>Загрузка корзины...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: 720 }}>
      <h1 style={{ marginBottom: 16 }}>Оформить заказ для покупателя</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Выберите товары в каталоге, добавьте их в корзину, затем укажите email покупателя и оформите
        заказ. После проверки другим менеджером вы сможете отправить заказ на email покупателя.
      </p>
      <Link href="/catalog/products" style={{ display: 'inline-block', marginBottom: 24 }}>
        ← Перейти в каталог
      </Link>

      {cart.length === 0 ? (
        <div
          style={{
            padding: 32,
            border: '1px dashed #d1d5db',
            borderRadius: 8,
            textAlign: 'center',
            color: '#6b7280',
          }}
        >
          <p>Корзина пуста. Добавьте товары из каталога.</p>
          <Link
            href="/catalog/products"
            style={{ color: '#2563eb', marginTop: 8, display: 'inline-block' }}
          >
            Перейти в каталог
          </Link>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, marginBottom: 8 }}>Товары в корзине</h2>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {cart.map((item) => {
                const name =
                  item.product?.name ?? item.cardVariant?.name ?? item.component?.name ?? 'Товар';
                const price =
                  item.product?.price ?? item.cardVariant?.price ?? item.component?.price ?? 0;
                return (
                  <li key={item.id} style={{ padding: '8px 0', borderBottom: '1px solid #e5e7eb' }}>
                    {name} × {item.quantity} ={' '}
                    {(Number(price) * Number(item.quantity)).toLocaleString('ru-RU')} ₽
                  </li>
                );
              })}
            </ul>
            <p style={{ marginTop: 8, fontWeight: 600 }}>
              Итого: {subtotal.toLocaleString('ru-RU')} ₽
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {error && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 16,
                  background: '#fef2f2',
                  color: '#dc2626',
                  borderRadius: 6,
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  padding: 12,
                  marginBottom: 16,
                  background: '#f0fdf4',
                  color: '#16a34a',
                  borderRadius: 6,
                }}
              >
                {success}
              </div>
            )}

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>
                Email покупателя *
              </label>
              <input
                type="email"
                value={form.customerEmail}
                onChange={(e) => setForm((f) => ({ ...f, customerEmail: e.target.value }))}
                required
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: 6,
                }}
                placeholder="customer@example.com"
              />
            </div>
            <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Имя</label>
                <input
                  type="text"
                  value={form.customerFirstName}
                  onChange={(e) => setForm((f) => ({ ...f, customerFirstName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                  }}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: 4 }}>Фамилия</label>
                <input
                  type="text"
                  value={form.customerLastName}
                  onChange={(e) => setForm((f) => ({ ...f, customerLastName: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: 6,
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={form.wantDelivery}
                  onChange={(e) => setForm((f) => ({ ...f, wantDelivery: e.target.checked }))}
                />
                Указать адрес доставки
              </label>
            </div>
            {form.wantDelivery && (
              <div
                style={{
                  padding: 16,
                  marginBottom: 16,
                  background: '#f9fafb',
                  borderRadius: 8,
                  border: '1px solid #e5e7eb',
                }}
              >
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Город</label>
                  <input
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Улица, дом</label>
                  <input
                    type="text"
                    value={form.street}
                    onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    Расстояние от Мурманска, км
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={form.distanceKm}
                    onChange={(e) => setForm((f) => ({ ...f, distanceKm: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                    }}
                  />
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>Тип доставки</label>
                  <select
                    value={form.deliveryType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, deliveryType: e.target.value as DeliveryType }))
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                    }}
                  >
                    <option value="TO_ENTRANCE">До подъезда</option>
                    <option value="TO_APARTMENT">Подъём в квартиру</option>
                  </select>
                </div>
                {form.deliveryType === 'TO_APARTMENT' && (
                  <>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'block', marginBottom: 4 }}>Этаж</label>
                      <input
                        type="number"
                        min="1"
                        value={form.deliveryFloor}
                        onChange={(e) => setForm((f) => ({ ...f, deliveryFloor: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: 6,
                        }}
                      />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="checkbox"
                          checked={form.deliveryHasElevator}
                          onChange={(e) =>
                            setForm((f) => ({ ...f, deliveryHasElevator: e.target.checked }))
                          }
                        />
                        Есть лифт
                      </label>
                    </div>
                  </>
                )}
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'block', marginBottom: 4 }}>
                    Удобное время доставки
                  </label>
                  <input
                    type="text"
                    value={form.preferredDeliveryTime}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, preferredDeliveryTime: e.target.value }))
                    }
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d1d5db',
                      borderRadius: 6,
                    }}
                    placeholder="Например: 10:00–14:00"
                  />
                </div>
                {calculatedDelivery && (
                  <p style={{ color: '#6b7280', fontSize: 14 }}>
                    Доставка: {calculatedDelivery.deliveryCost.toLocaleString('ru-RU')} ₽
                    {calculatedDelivery.carryCost > 0 &&
                      `, грузчики: ${calculatedDelivery.carryCost.toLocaleString('ru-RU')} ₽`}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitInProgress}
              style={{
                padding: '10px 24px',
                background: submitInProgress ? '#9ca3af' : '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontWeight: 500,
                cursor: submitInProgress ? 'not-allowed' : 'pointer',
              }}
            >
              {submitInProgress ? 'Отправка...' : 'Отправить заказ на проверку'}
            </button>
          </form>
        </>
      )}

      <p style={{ marginTop: 24, fontSize: 14, color: '#6b7280' }}>
        <Link href="/admin/orders">← К списку заказов</Link>
      </p>
    </div>
  );
}
