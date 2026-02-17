'use client';

import React, { useCallback, useEffect, useState } from 'react';

import {
  type DeliveryConfigDto,
  getDeliveryConfig,
  updateDeliveryConfig,
} from '@/shared/api/admin-orders';

import styles from './page.module.css';

function toNum(v: string | number): number {
  return typeof v === 'string' ? parseFloat(v) || 0 : v;
}

export default function AdminOrdersShippingPage() {
  const [config, setConfig] = useState<DeliveryConfigDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDeliveryConfig();
      setConfig(data);
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
      await updateDeliveryConfig({
        deliveryPriceMurmansk: toNum(config.deliveryPriceMurmansk),
        deliveryPricePerKmOutside: toNum(config.deliveryPricePerKmOutside),
        moversPriceMurmansk: toNum(config.moversPriceMurmansk),
        moversPriceOutside: toNum(config.moversPriceOutside),
        moversKgPerPerson: toNum(config.moversKgPerPerson),
        moversVolumePerPerson:
          config.moversVolumePerPerson === '' || config.moversVolumePerPerson == null
            ? null
            : toNum(config.moversVolumePerPerson),
      });
      setMessage({ text: 'Настройки доставки сохранены' });
    } catch (err) {
      setMessage({
        text: err instanceof Error ? err.message : 'Ошибка сохранения',
        error: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const update = (key: keyof DeliveryConfigDto, value: string | number | null) => {
    if (!config) return;
    setConfig({ ...config, [key]: value });
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
          Управление расчётом стоимости доставки и грузчиков по г. Мурманск и за его пределами.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Стоимость доставки</h2>
          <div className={styles.grid}>
            <div className={styles.field}>
              <label htmlFor="deliveryPriceMurmansk">Стоимость доставки по г. Мурманск, ₽</label>
              <input
                id="deliveryPriceMurmansk"
                type="number"
                min={0}
                step={1}
                value={config.deliveryPriceMurmansk}
                onChange={(e) => update('deliveryPriceMurmansk', e.target.value)}
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="deliveryPricePerKmOutside">
                Стоимость доставки за 1 км за пределами Мурманска, ₽
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
