'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/features/auth';
import {
  type DeliveryConfigDto,
  type DeliverySettlementDto,
  getDeliveryConfig,
  updateDeliveryConfig,
} from '@/shared/api/admin-orders';
import { ROLES_CONFIG } from '@/views/admin/Settings';

import styles from './page.module.css';

/** Все роли кроме Пользователь и Гость — их можно допустить к оформлению заказа для клиента. */
const ROLES_ORDER_FOR_CUSTOMER: string[] = ROLES_CONFIG.filter(
  (r) => r.id !== 'USER' && r.id !== 'GUEST'
).map((r) => r.id);

function toNum(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) || 0 : v;
}

export default function AdminSettingsDeliveryPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';
  const [config, setConfig] = useState<DeliveryConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDeliveryConfig();
      setConfig({
        ...data,
        rolesAllowedOrderForCustomer:
          Array.isArray(data.rolesAllowedOrderForCustomer) &&
          data.rolesAllowedOrderForCustomer.length > 0
            ? data.rolesAllowedOrderForCustomer
            : ['SUPER_ADMIN', 'ADMIN', 'MANAGER'],
      });
    } catch {
      setConfig(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: Parameters<typeof updateDeliveryConfig>[0] = {
        deliveryPricePerKmOutside: toNum(config.deliveryPricePerKmOutside),
        deliveryPaymentMode: config.deliveryPaymentMode === 'ON_SITE' ? 'ON_SITE' : 'WITH_ORDER',
        moversPriceMurmansk: toNum(config.moversPriceMurmansk),
        moversPriceOutside: toNum(config.moversPriceOutside),
        moversKgPerPerson: toNum(config.moversKgPerPerson),
        moversVolumePerPerson:
          config.moversVolumePerPerson === '' || config.moversVolumePerPerson == null
            ? null
            : toNum(config.moversVolumePerPerson),
        settlements: settlements
          .map((s, i) => ({
            id: s.id,
            name: (typeof s.name === 'string' ? s.name : '').trim(),
            price: toNum(s.price),
            order: i,
          }))
          .filter((s) => s.name.length > 0),
      };
      if (isSuperAdmin && config.rolesAllowedOrderForCustomer) {
        payload.rolesAllowedOrderForCustomer = config.rolesAllowedOrderForCustomer;
      }
      await updateDeliveryConfig(payload);
      setMessage({ text: 'Настройки доставки сохранены' });
      await load();
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const update = (
    key: keyof Omit<DeliveryConfigDto, 'settlements' | 'rolesAllowedOrderForCustomer'>,
    value: string | number | null
  ) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
  };

  const setRolesAllowedOrderForCustomer = (roleId: string, checked: boolean) => {
    if (!config) return;
    const current = config.rolesAllowedOrderForCustomer ?? [];
    const next = checked ? [...current, roleId] : current.filter((r) => r !== roleId);
    setConfig({ ...config, rolesAllowedOrderForCustomer: next });
  };

  const settlements = config?.settlements ?? [];

  const updateSettlement = (index: number, field: 'name' | 'price', value: string | number) => {
    if (!config) return;
    const next = [...settlements];
    const s = next[index] as DeliverySettlementDto;
    next[index] = { ...s, [field]: value };
    setConfig({ ...config, settlements: next });
  };

  const addSettlement = () => {
    if (!config) return;
    setConfig({
      ...config,
      settlements: [...settlements, { id: '', name: '', price: 0, order: settlements.length }],
    });
  };

  const removeSettlement = (index: number) => {
    if (!config) return;
    const next = settlements.filter((_, i) => i !== index);
    setConfig({ ...config, settlements: next });
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек доставки...</p>
      </div>
    );
  }

  if (!config) {
    return (
      <div className={styles.page}>
        <p className={styles.error}>Не удалось загрузить настройки доставки</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Доставка</h1>
        <p className={styles.subtitle}>
          Настройка стоимости доставки по населённым пунктам. Добавьте населённые пункты и укажите
          фиксированную стоимость доставки в каждый.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        {isSuperAdmin && (
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Оформление заказов для клиентов</h2>
            <p className={styles.hint}>
              Выберите роли, которым разрешено оформлять заказ за клиента (корзина менеджера → заказ
              на email клиента). Остальные не смогут использовать эту функцию.
            </p>
            <div className={styles.rolesCheckboxList}>
              {ROLES_ORDER_FOR_CUSTOMER.map((roleId) => {
                const roleConfig = ROLES_CONFIG.find((r) => r.id === roleId);
                const label = roleConfig?.label ?? roleId;
                const checked = (config.rolesAllowedOrderForCustomer ?? []).includes(roleId);
                return (
                  <label key={roleId} className={styles.roleCheckboxLabel}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => setRolesAllowedOrderForCustomer(roleId, e.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                );
              })}
            </div>
          </section>
        )}

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Оплата доставки</h2>
          <p className={styles.hint}>
            Выберите, когда покупатель оплачивает доставку: вместе с заказом или при получении.
          </p>
          <div className={styles.radioGroup}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryPaymentMode"
                checked={(config.deliveryPaymentMode ?? 'WITH_ORDER') === 'WITH_ORDER'}
                onChange={() => update('deliveryPaymentMode', 'WITH_ORDER')}
              />
              <span>Оплата доставки вместе с заказом</span>
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="deliveryPaymentMode"
                checked={config.deliveryPaymentMode === 'ON_SITE'}
                onChange={() => update('deliveryPaymentMode', 'ON_SITE')}
              />
              <span>Оплата доставки по месту</span>
            </label>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Населённые пункты и стоимость доставки</h2>
          <p className={styles.hint}>
            Добавьте населённые пункты с фиксированной стоимостью доставки. Если адрес не в списке,
            используется стоимость за км.
          </p>
          <div className={styles.settlementsList}>
            {settlements.map((s, i) => (
              <div key={s.id || `new-${i}`} className={styles.settlementRow}>
                <input
                  type="text"
                  placeholder="Населённый пункт (напр. Мурманск)"
                  value={s.name}
                  onChange={(e) => updateSettlement(i, 'name', e.target.value)}
                  className={styles.settlementName}
                />
                <input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="₽"
                  value={s.price}
                  onChange={(e) => updateSettlement(i, 'price', e.target.value)}
                  className={styles.settlementPrice}
                />
                <button
                  type="button"
                  onClick={() => removeSettlement(i)}
                  className={styles.removeBtn}
                  disabled={settlements.length === 0}
                  title="Удалить"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={addSettlement} className={styles.addBtn}>
            + Добавить населённый пункт
          </button>

          <div className={`${styles.grid} ${styles.gridSpaced}`}>
            <div className={styles.field}>
              <label htmlFor="deliveryPricePerKmOutside">
                Стоимость за 1 км для адресов вне списка, ₽
              </label>
              <input
                id="deliveryPricePerKmOutside"
                type="number"
                min={0}
                step={0.01}
                value={config.deliveryPricePerKmOutside}
                onChange={(e) => update('deliveryPricePerKmOutside', e.target.value)}
              />
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Грузчики</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="moversPriceMurmansk">
                Стоимость грузчиков в Мурманске (за 1 чел.), ₽
              </label>
              <input
                id="moversPriceMurmansk"
                type="number"
                min={0}
                step={1}
                value={config.moversPriceMurmansk}
                onChange={(e) => update('moversPriceMurmansk', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="moversPriceOutside">
                Стоимость грузчиков за пределами города (за 1 чел.), ₽
              </label>
              <input
                id="moversPriceOutside"
                type="number"
                min={0}
                step={1}
                value={config.moversPriceOutside}
                onChange={(e) => update('moversPriceOutside', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="moversKgPerPerson">
                Кг на одного грузчика (кол-во грузчиков = суммарная масса ÷ это значение)
              </label>
              <input
                id="moversKgPerPerson"
                type="number"
                min={1}
                step={1}
                value={config.moversKgPerPerson}
                onChange={(e) => update('moversKgPerPerson', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="moversVolumePerPerson">
                м³ на одного грузчика (опционально, для расчёта по габаритам)
              </label>
              <input
                id="moversVolumePerPerson"
                type="number"
                min={0}
                step={0.01}
                value={config.moversVolumePerPerson ?? ''}
                onChange={(e) =>
                  update('moversVolumePerPerson', e.target.value === '' ? null : e.target.value)
                }
                placeholder="0.5"
              />
            </div>
          </div>
        </section>

        {message && (
          <p className={message.error ? styles.msgError : styles.msgSuccess}>{message.text}</p>
        )}

        <button type="submit" className={styles.submit} disabled={saving}>
          {saving ? 'Сохранение…' : 'Сохранить'}
        </button>
      </form>
    </div>
  );
}
