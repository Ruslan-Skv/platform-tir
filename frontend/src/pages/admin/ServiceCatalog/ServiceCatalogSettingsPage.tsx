'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';

import { useAuth } from '@/features/auth';

import styles from './ServiceCatalogSectionPage.module.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

interface ServiceCatalogBlock {
  id: string;
  title: string;
  showPricesInPublic: boolean;
}

export function ServiceCatalogSettingsPage() {
  const { getAuthHeaders } = useAuth();
  const [block, setBlock] = useState<ServiceCatalogBlock | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/block`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const b = await res.json();
        setBlock(b);
      } else {
        setBlock(null);
      }
    } catch {
      setBlock(null);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaveBlock = async () => {
    if (!block) return;
    setSaving(true);
    try {
      const res = await fetch(`${API_URL}/admin/service-catalog/block`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(block),
      });
      if (res.ok) {
        showMessage('success', 'Настройки сохранены');
      } else {
        showMessage('error', 'Ошибка сохранения');
      }
    } catch {
      showMessage('error', 'Ошибка подключения');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Настройки каталога услуг</h1>
        <div className={styles.headerActions}>
          <Link href="/admin/service-catalog" className={styles.viewLink}>
            ← К категориям
          </Link>
        </div>
      </div>

      {message && <div className={`${styles.message} ${styles[message.type]}`}>{message.text}</div>}

      {block && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Настройки раздела</h2>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Заголовок раздела</label>
              <input
                type="text"
                value={block.title}
                onChange={(e) => setBlock({ ...block, title: e.target.value })}
                className={styles.input}
                placeholder="Каталог услуг"
              />
            </div>
            <label className={styles.checkbox}>
              <input
                type="checkbox"
                checked={block.showPricesInPublic}
                onChange={(e) => setBlock({ ...block, showPricesInPublic: e.target.checked })}
              />
              Показывать стоимость в публичной части
            </label>
          </div>
          <button
            type="button"
            className={styles.saveButton}
            onClick={handleSaveBlock}
            disabled={saving}
          >
            {saving ? 'Сохранение...' : 'Сохранить настройки'}
          </button>
        </section>
      )}
    </div>
  );
}
