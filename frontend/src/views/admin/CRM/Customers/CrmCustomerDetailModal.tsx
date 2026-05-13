'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { type CrmCustomerDetail, getCrmCustomer } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import styles from './CrmCustomerDetailModal.module.css';

function disp(v: string | undefined | null): string {
  const s = v != null ? String(v).trim() : '';
  return s === '' ? '—' : s;
}

function extStr(ext: Record<string, unknown> | null | undefined, key: string): string {
  if (!ext) return '—';
  const v = ext[key];
  return typeof v === 'string' && v.trim() ? v : '—';
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-modal-field>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

export function CrmCustomerDetailModal({
  customerId,
  isOpen,
  onClose,
}: {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<CrmCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setData(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getCrmCustomer(customerId)
      .then((row) => {
        if (!cancelled) setData(row);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, customerId]);

  const ext = data?.extendedProfile as Record<string, unknown> | undefined;
  const displayName = data
    ? [data.firstName, data.lastName].filter((x) => (x ?? '').trim()).join(' ') ||
      data.company?.trim() ||
      data.email
    : '';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Карточка клиента" size="lg" showCloseButton>
      {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
      {error ? <p data-modal-form-error>{error}</p> : null}
      {data && !loading ? (
        <div data-modal-readonly-panel data-modal-density="compact">
          <dl data-modal-detail>
            <Field label="ФИО / наименование">{disp(displayName)}</Field>
            <Field label="Тип">{disp(data.entityType ?? extStr(ext ?? null, 'type'))}</Field>
            <Field label="E-mail">{disp(data.email)}</Field>
            <Field label="Телефон">{disp(data.phone || data.phones?.[0])}</Field>
            <Field label="Компания">{disp(data.company)}</Field>
            <Field label="Статус">{disp(data.status)}</Field>
            <Field label="Этап воронки">{disp(data.stage)}</Field>
            <Field label="Создан">{disp(data.createdAt)}</Field>
            <Field label="Менеджер">
              {data.manager
                ? [data.manager.firstName, data.manager.lastName].filter(Boolean).join(' ') ||
                  data.manager.email
                : '—'}
            </Field>
            <Field label="Адрес (профиль)">{extStr(ext ?? null, 'address')}</Field>
            <Field label="Заметки">{disp(data.notes)}</Field>
          </dl>
          <div className={styles.footerActions}>
            <Link href="/admin/measurements/repair" className={styles.footerLink} onClick={onClose}>
              К списку замеров
            </Link>
            <Link
              href={`/admin/measurements/repair?search=${encodeURIComponent(data.phone || data.phones?.[0] || displayName)}`}
              className={styles.footerLink}
              onClick={onClose}
            >
              Найти замеры по телефону / имени
            </Link>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
