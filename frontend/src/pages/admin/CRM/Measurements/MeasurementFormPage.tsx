'use client';

import { useCallback, useEffect, useState } from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  type CrmDirection,
  type CrmUser,
  createMeasurement,
  getCrmDirections,
  getCrmUsers,
  getMeasurement,
  updateMeasurement,
} from '@/shared/api/admin-crm';

import styles from './MeasurementFormPage.module.css';
import { MeasurementHistoryModal } from './MeasurementHistoryModal';

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Новый' },
  { value: 'ASSIGNED', label: 'Назначен' },
  { value: 'IN_PROGRESS', label: 'В работе' },
  { value: 'COMPLETED', label: 'Выполнен' },
  { value: 'CANCELLED', label: 'Отменён' },
  { value: 'CONVERTED', label: 'В договор' },
];

function formatDateForInput(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s);
  return d.toISOString().slice(0, 10);
}

/** Проверка формата телефона: минимум 10 цифр (российский номер) */
function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 11;
}

type FieldKey = 'managerId' | 'receptionDate' | 'executionDate' | 'customerName' | 'customerPhone';

interface MeasurementFormPageProps {
  measurementId?: string | null;
}

export function MeasurementFormPage({ measurementId }: MeasurementFormPageProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [managerId, setManagerId] = useState('');
  const [receptionDate, setReceptionDate] = useState(formatDateForInput(new Date().toISOString()));
  const [executionDate, setExecutionDate] = useState('');
  const [surveyorId, setSurveyorId] = useState('');
  const [directionId, setDirectionId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [comments, setComments] = useState('');
  const [status, setStatus] = useState('NEW');
  const [loading, setLoading] = useState(!!measurementId);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [directions, setDirections] = useState<CrmDirection[]>([]);
  const [users, setUsers] = useState<CrmUser[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const clearFieldError = useCallback((field: FieldKey) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  }, []);

  const loadMeasurement = useCallback(async () => {
    if (!measurementId) return;
    setLoading(true);
    try {
      const data = await getMeasurement(measurementId);
      setManagerId(data.managerId);
      setReceptionDate(formatDateForInput(data.receptionDate));
      setExecutionDate(formatDateForInput(data.executionDate));
      setSurveyorId(data.surveyorId ?? '');
      setDirectionId(data.directionId ?? '');
      setCustomerName(data.customerName);
      setCustomerAddress(data.customerAddress ?? '');
      setCustomerPhone(data.customerPhone);
      setComments(data.comments ?? '');
      setStatus(data.status);
    } catch {
      showMessage('error', 'Ошибка загрузки замера');
    } finally {
      setLoading(false);
    }
  }, [measurementId, showMessage]);

  useEffect(() => {
    loadMeasurement();
  }, [loadMeasurement]);

  useEffect(() => {
    if (measurementId && searchParams.get('created') === '1') {
      showMessage('success', 'Замер создан');
      router.replace(`/admin/crm/measurements/${measurementId}`, { scroll: false });
    }
  }, [measurementId, searchParams, router, showMessage]);

  useEffect(() => {
    getCrmDirections()
      .then(setDirections)
      .catch(() => setDirections([]));
    getCrmUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  const validate = (): boolean => {
    const errors: Partial<Record<FieldKey, string>> = {};

    if (!managerId.trim()) {
      errors.managerId = 'Выберите менеджера';
    }

    if (!receptionDate) {
      errors.receptionDate = 'Укажите дату приёма замера';
    }

    if (executionDate) {
      const exec = new Date(executionDate);
      const rec = new Date(receptionDate);
      if (exec < rec) {
        errors.executionDate = 'Дата выполнения не может быть раньше даты приёма';
      }
    }

    if (!customerName.trim()) {
      errors.customerName = 'Введите ФИО заказчика';
    } else if (customerName.trim().length < 2) {
      errors.customerName = 'ФИО должно содержать минимум 2 символа';
    }

    if (!customerPhone.trim()) {
      errors.customerPhone = 'Введите телефон заказчика';
    } else if (!isValidPhone(customerPhone)) {
      errors.customerPhone =
        'Неверный формат телефона. Введите номер в формате: +7 (999) 123-45-67 или 8 999 123-45-67 (минимум 10 цифр)';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0];
      if (firstError) showMessage('error', firstError);
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!validate()) return;

    setSaving(true);
    try {
      const payload = {
        managerId,
        receptionDate,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        status,
        ...(executionDate && { executionDate }),
        ...(surveyorId && { surveyorId }),
        ...(directionId && { directionId }),
        ...(customerAddress.trim() && { customerAddress: customerAddress.trim() }),
        ...(comments.trim() && { comments: comments.trim() }),
      };

      if (measurementId) {
        await updateMeasurement(measurementId, payload);
        showMessage('success', 'Замер обновлён');
      } else {
        const created = await createMeasurement(payload);
        router.push(`/admin/crm/measurements/${created.id}?created=1`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Ошибка сохранения';
      showMessage('error', msg);
      setFieldErrors({});
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Загрузка...</div>
      </div>
    );
  }

  const managers = users.filter((u) =>
    [
      'SUPER_ADMIN',
      'ADMIN',
      'MODERATOR',
      'SUPPORT',
      'BRIGADIER',
      'LEAD_SPECIALIST_FURNITURE',
      'LEAD_SPECIALIST_WINDOWS_DOORS',
    ].includes(u.role)
  );
  const surveyors = users.filter((u) => u.role === 'SURVEYOR');

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/admin/crm/measurements" className={styles.backLink}>
          ← К списку замеров
        </Link>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>
            {measurementId ? 'Редактирование замера' : 'Новый замер'}
          </h1>
          {measurementId && (
            <button
              type="button"
              className={styles.historyButton}
              onClick={() => setShowHistory(true)}
              title="История изменений"
            >
              📋 История
            </button>
          )}
        </div>
      </div>

      {message && (
        <div className={`${styles.message} ${styles[`message${message.type}`]}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.grid}>
          <div className={styles.row}>
            <label className={styles.label} htmlFor="managerId">
              Менеджер <span className={styles.required}>*</span>
            </label>
            <select
              id="managerId"
              value={managerId}
              onChange={(e) => {
                setManagerId(e.target.value);
                clearFieldError('managerId');
              }}
              className={`${styles.select} ${fieldErrors.managerId ? styles.inputError : ''}`}
              required
              aria-invalid={!!fieldErrors.managerId}
              aria-describedby={fieldErrors.managerId ? 'managerId-error' : undefined}
            >
              <option value="">— Выберите —</option>
              {managers.length > 0
                ? managers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
                    </option>
                  ))
                : users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')} ({u.role})
                    </option>
                  ))}
            </select>
            {fieldErrors.managerId && (
              <span id="managerId-error" className={styles.fieldError} role="alert">
                {fieldErrors.managerId}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="receptionDate">
              Дата приёма <span className={styles.required}>*</span>
            </label>
            <input
              id="receptionDate"
              type="date"
              value={receptionDate}
              onChange={(e) => {
                setReceptionDate(e.target.value);
                clearFieldError('receptionDate');
              }}
              className={`${styles.input} ${fieldErrors.receptionDate ? styles.inputError : ''}`}
              required
              aria-invalid={!!fieldErrors.receptionDate}
              aria-describedby={fieldErrors.receptionDate ? 'receptionDate-error' : undefined}
            />
            {fieldErrors.receptionDate && (
              <span id="receptionDate-error" className={styles.fieldError} role="alert">
                {fieldErrors.receptionDate}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="executionDate">
              Дата выполнения
            </label>
            <input
              id="executionDate"
              type="date"
              value={executionDate}
              onChange={(e) => {
                setExecutionDate(e.target.value);
                clearFieldError('executionDate');
              }}
              className={`${styles.input} ${fieldErrors.executionDate ? styles.inputError : ''}`}
              aria-invalid={!!fieldErrors.executionDate}
              aria-describedby={fieldErrors.executionDate ? 'executionDate-error' : undefined}
            />
            {fieldErrors.executionDate && (
              <span id="executionDate-error" className={styles.fieldError} role="alert">
                {fieldErrors.executionDate}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Замерщик</label>
            <select
              value={surveyorId}
              onChange={(e) => setSurveyorId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Не назначен —</option>
              {surveyors.length > 0
                ? surveyors.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                    </option>
                  ))
                : users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {[u.firstName, u.lastName].filter(Boolean).join(' ')}
                    </option>
                  ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Направление</label>
            <select
              value={directionId}
              onChange={(e) => setDirectionId(e.target.value)}
              className={styles.select}
            >
              <option value="">— Выберите —</option>
              {directions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerName">
              ФИО заказчика <span className={styles.required}>*</span>
            </label>
            <input
              id="customerName"
              type="text"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                clearFieldError('customerName');
              }}
              className={`${styles.input} ${fieldErrors.customerName ? styles.inputError : ''}`}
              placeholder="Иванов Иван Иванович"
              required
              aria-invalid={!!fieldErrors.customerName}
              aria-describedby={fieldErrors.customerName ? 'customerName-error' : undefined}
            />
            {fieldErrors.customerName && (
              <span id="customerName-error" className={styles.fieldError} role="alert">
                {fieldErrors.customerName}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Адрес</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className={styles.input}
              placeholder="г. Мурманск, ул. Ленина, д. 1"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label} htmlFor="customerPhone">
              Телефон заказчика <span className={styles.required}>*</span>
            </label>
            <input
              id="customerPhone"
              type="tel"
              value={customerPhone}
              onChange={(e) => {
                setCustomerPhone(e.target.value);
                clearFieldError('customerPhone');
              }}
              className={`${styles.input} ${fieldErrors.customerPhone ? styles.inputError : ''}`}
              placeholder="+7 (999) 123-45-67 или 8 999 123-45-67"
              required
              aria-invalid={!!fieldErrors.customerPhone}
              aria-describedby={fieldErrors.customerPhone ? 'customerPhone-error' : undefined}
            />
            {fieldErrors.customerPhone && (
              <span id="customerPhone-error" className={styles.fieldError} role="alert">
                {fieldErrors.customerPhone}
              </span>
            )}
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Статус</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={styles.select}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.row}>
          <label className={styles.label}>Комментарии</label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            className={styles.textarea}
            rows={3}
            placeholder="Дополнительная информация..."
          />
        </div>

        <div className={styles.actions}>
          <button type="submit" className={styles.submitButton} disabled={saving}>
            {saving ? 'Сохранение...' : measurementId ? 'Сохранить' : 'Создать замер'}
          </button>
          <Link href="/admin/crm/measurements" className={styles.cancelLink}>
            Отмена
          </Link>
        </div>
      </form>

      {measurementId && showHistory && (
        <MeasurementHistoryModal
          measurementId={measurementId}
          measurementName={customerName || undefined}
          users={users}
          directions={directions}
          onClose={() => setShowHistory(false)}
          onRollback={loadMeasurement}
        />
      )}
    </div>
  );
}
