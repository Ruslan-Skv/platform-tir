'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';
import { apiFetch } from '@/shared/lib/api-fetch';

import actionStyles from '../shared/SettingsActions.module.css';
import styles from '../shared/SettingsPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export function PartnerProductsSection() {
  const { getAuthHeaders } = useAuth();
  const [showPartnerIconOnCards, setShowPartnerIconOnCards] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await apiFetch(`${API_URL}/admin/home/partner-products`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setShowPartnerIconOnCards(data.showPartnerIconOnCards ?? true);
      }
    } catch (err) {
      console.error('Failed to fetch partner products settings:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await apiFetch(`${API_URL}/admin/home/partner-products`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          showPartnerIconOnCards,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.message || 'Ошибка сохранения');
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className={styles.section}>Загрузка...</div>;
  }

  return (
    <section className={styles.section}>
      <h2 className={styles.sectionTitle}>Товары партнёра</h2>
      <p className={styles.sectionDescription}>
        Настройки отображения товаров партнёра на карточках в публичной части. Товар привязывается к
        партнёру в форме редактирования товара (поле «Партнёр»). Логотип настраивается для каждого
        партнёра в разделе{' '}
        <Link href="/admin/partners" className={styles.infoBlockLink}>
          Партнёры
        </Link>
        .
      </p>

      <div className={styles.roleCard}>
        <div className={actionStyles.formGroupSpaced}>
          <label className={styles.templateCheckboxLabel}>
            <input
              type="checkbox"
              checked={showPartnerIconOnCards}
              onChange={(e) => setShowPartnerIconOnCards(e.target.checked)}
            />
            Показывать иконку партнёра на карточках товаров
          </label>
          <p className={`${styles.sectionDescription} ${actionStyles.hintText}`}>
            Включите, чтобы отображать логотип партнёра на карточках товаров. Логотип берётся из
            настроек конкретного партнёра.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={actionStyles.primaryButton}
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
        {saved && <span className={actionStyles.savedHint}>✓ Сохранено</span>}
      </div>
    </section>
  );
}
