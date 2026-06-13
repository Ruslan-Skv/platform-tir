'use client';

import React, { useCallback, useEffect, useState } from 'react';

import { getDeliveryConfig, updateDeliveryConfig } from '@/shared/api/admin-orders';

import styles from '../delivery/DeliverySettingsPage.module.css';

export function CheckoutSettingsPageView() {
  const [approvalValidMinutes, setApprovalValidMinutes] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await getDeliveryConfig();
      setApprovalValidMinutes(data.approvalValidMinutes ?? 60);
    } catch {
      setApprovalValidMinutes(60);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const value = Math.max(1, Math.min(1440, approvalValidMinutes));
      await updateDeliveryConfig({ approvalValidMinutes: value });
      setMessage({ text: 'Настройки оформления заказов сохранены' });
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

  if (loading) {
    return (
      <div className={styles.page}>
        <p className={styles.loading}>Загрузка настроек оформления заказов...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Оформление заказов</h1>
        <p className={styles.subtitle}>
          Настройки процесса оформления заказа покупателем после проверки менеджером.
        </p>
      </header>

      <form onSubmit={handleSubmit} className={styles.form}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Заказ проверен</h2>
          <p className={styles.hint}>
            Время действия статуса «Заказ проверен» (минуты). Если покупатель не оформит заказ за
            это время, заказ отменяется, а товары и услуги остаются в корзине.
          </p>
          <div className={styles.field}>
            <label htmlFor="approvalValidMinutes">Время на оформление, мин</label>
            <input
              id="approvalValidMinutes"
              type="number"
              min={1}
              max={1440}
              step={1}
              value={approvalValidMinutes}
              onChange={(e) =>
                setApprovalValidMinutes(
                  e.target.value === '' ? 60 : Math.max(1, Math.min(1440, Number(e.target.value)))
                )
              }
            />
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
