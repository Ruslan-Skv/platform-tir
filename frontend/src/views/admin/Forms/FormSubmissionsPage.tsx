'use client';

import { useCallback, useEffect, useState } from 'react';

import { type AdminFormSubmission, getAdminFormSubmissions } from '@/shared/api/admin-forms';

import styles from './FormSubmissionsPage.module.css';

const TYPE_LABELS: Record<string, string> = {
  measurement: 'Запись на замер',
  callback: 'Обратный звонок',
};

export function FormSubmissionsPage() {
  const [submissions, setSubmissions] = useState<AdminFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'measurement' | 'callback' | ''>('');

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminFormSubmissions(1, 100, typeFilter || undefined);
      setSubmissions(res.data);
    } catch {
      setSubmissions([]);
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const formatDate = (dateStr: string) => {
    return new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateStr));
  };

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Заявки с форм</h1>
        <p className={styles.subtitle}>Записи на замер и заказы обратного звонка с сайта</p>
      </header>

      <div className={styles.toolbar}>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'measurement' | 'callback' | '')}
          className={styles.select}
        >
          <option value="">Все заявки</option>
          <option value="measurement">Запись на замер</option>
          <option value="callback">Обратный звонок</option>
        </select>
        <button
          type="button"
          className={styles.refreshButton}
          onClick={loadSubmissions}
          disabled={loading}
        >
          Обновить
        </button>
      </div>

      {loading ? (
        <p className={styles.loading}>Загрузка...</p>
      ) : submissions.length === 0 ? (
        <p className={styles.empty}>Нет заявок</p>
      ) : (
        <div className={styles.list}>
          {submissions.map((s) => (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.type}>{TYPE_LABELS[s.type] || s.type}</span>
                <span className={styles.date}>{formatDate(s.createdAt)}</span>
              </div>
              <div className={styles.cardBody}>
                <p>
                  <strong>{s.name}</strong> — {s.phone}
                </p>
                {s.email && <p>Email: {s.email}</p>}
                {s.address && <p>Адрес: {s.address}</p>}
                {s.preferredDate && <p>Дата: {s.preferredDate}</p>}
                <p>Время: {s.preferredTime}</p>
                {s.productType && <p>Тип: {s.productType}</p>}
                {s.comment && <p className={styles.comment}>{s.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
