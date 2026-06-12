'use client';

import styles from './FormSubmissionsPage.module.css';
import { SUBJECT_LABELS, TYPE_LABELS } from './form-submissions-page.constants';
import { formatDate } from './form-submissions-page.utils';
import type { FormSubmissionsPageModel } from './hooks/useFormSubmissionsPage';

type FormSubmissionsPageViewProps = {
  model: FormSubmissionsPageModel;
};

export function FormSubmissionsPageView({ model }: FormSubmissionsPageViewProps) {
  const { submissions, loading, typeFilter, setTypeFilter, loadSubmissions } = model;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Заявки с форм</h1>
        <p className={styles.subtitle}>Записи на замер и заказы обратного звонка с сайта</p>
      </header>

      <div className={styles.toolbar}>
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as 'measurement' | 'callback' | 'director' | 'quote' | '')
          }
          className={styles.select}
        >
          <option value="">Все заявки</option>
          <option value="measurement">Запись на замер</option>
          <option value="callback">Обратный звонок</option>
          <option value="director">Письмо директору</option>
          <option value="quote">Рассчитать стоимость</option>
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
                  <strong>{s.name}</strong>
                  {s.phone && ` — ${s.phone}`}
                </p>
                {s.email && <p>Email: {s.email}</p>}
                {s.type !== 'director' && (
                  <>
                    {s.address && <p>Адрес: {s.address}</p>}
                    {s.preferredDate && <p>Дата: {s.preferredDate}</p>}
                    {s.preferredTime && <p>Время: {s.preferredTime}</p>}
                    {s.productType && <p>Тип: {s.productType}</p>}
                  </>
                )}
                {s.subject && <p>Тема: {SUBJECT_LABELS[s.subject] ?? s.subject}</p>}
                {s.comment && <p className={styles.comment}>{s.comment}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
