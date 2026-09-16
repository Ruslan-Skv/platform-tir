'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { type Measurement, getMeasurements } from '@/shared/api/admin-crm';

import link from './PackageMeasurementLinkSection.module.css';

function formatMeasurementDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function measurementStatusLabels(status: string): string {
  const map: Record<string, string> = {
    NEW: 'Новый',
    ASSIGNED: 'Назначен',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершён',
    CANCELLED: 'Отменён',
    CONVERTED: 'Конвертирован',
  };
  return map[status] ?? status;
}

function measurementPickerLabel(m: Measurement): string {
  const parts = [formatMeasurementDate(m.receptionDate), m.customerAddress?.trim() || 'без адреса'];
  return parts.join(' — ');
}

export type PackageMeasurementLinkSectionProps = {
  linkedMeasurementId: string;
  /** Карточка заказчика, выбранная на вкладке «Данные» (источник замеров для связи). */
  linkedCrmCustomerId: string | null;
  onLink: (measurementId: string) => void;
  onUnlink: () => void;
  /** Где отображается — на вкладке «Замер» или под блоком поиска заказчика на вкладке «Данные». */
  placement?: 'measurement' | 'data';
  /** Текущее значение поля «Замерщик» (form.contract.surveyorUserId). */
  surveyorUserId?: string;
  /** Автозаполнение поля «Замерщик» замерщиком из связанного замера (только если поле пустое). */
  onAutoFillSurveyor?: (surveyorUserId: string) => void;
};

/**
 * Ручная связь пакета с замером. Используется на вкладке «Замер» и на вкладке «Данные»
 * (оба места редактируют одно и то же поле формы — они синхронизированы).
 * Замеры предлагает только того заказчика, который выбран на вкладке «Данные».
 */
export function PackageMeasurementLinkSection({
  linkedMeasurementId,
  linkedCrmCustomerId,
  onLink,
  onUnlink,
  placement = 'measurement',
  surveyorUserId,
  onAutoFillSurveyor,
}: PackageMeasurementLinkSectionProps) {
  const [measurements, setMeasurements] = useState<Measurement[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState('');

  useEffect(() => {
    let aborted = false;
    void getMeasurements({ page: 1, limit: 500 })
      .then((res) => {
        if (aborted) return;
        setMeasurements(res.data);
        setLoadError(null);
      })
      .catch(() => {
        if (!aborted) setLoadError('Не удалось загрузить список замеров');
      });
    return () => {
      aborted = true;
    };
  }, []);

  const linked = useMemo(
    () => measurements?.find((m) => m.id === linkedMeasurementId) ?? null,
    [measurements, linkedMeasurementId]
  );

  /** Замеры только того заказчика, что выбран на вкладке «Данные». */
  const customerMeasurements = useMemo(
    () => measurements?.filter((m) => m.customerId === linkedCrmCustomerId) ?? [],
    [measurements, linkedCrmCustomerId]
  );

  /**
   * Автозаполнение «Замерщика» из связанного замера — один раз на замер
   * (пока поле пустое), чтобы не затирать осознанно очищенное значение.
   */
  const autoFilledMeasurementRef = useRef<string | null>(null);
  useEffect(() => {
    const surveyorId = linked?.surveyorId;
    if (!onAutoFillSurveyor || !surveyorId) return;
    if (autoFilledMeasurementRef.current === linked.id) return;
    autoFilledMeasurementRef.current = linked.id;
    if (!surveyorUserId?.trim()) onAutoFillSurveyor(surveyorId);
  }, [linked, surveyorUserId, onAutoFillSurveyor]);

  if (loadError) {
    return <p className={link.errorText}>{loadError}</p>;
  }

  const cardClassName =
    placement === 'data'
      ? `${link.measurementLinkCard} ${link.measurementLinkCardData}`
      : link.measurementLinkCard;

  if (linkedMeasurementId) {
    const customerMismatch =
      linked != null && linked.customerId != null && linked.customerId !== linkedCrmCustomerId;
    return (
      <div className={cardClassName}>
        <h4 className={link.measurementLinkTitle}>Связанный замер</h4>
        {linked ? (
          <dl className={link.measurementLinkList}>
            <div>
              <dt>Принят</dt>
              <dd>{formatMeasurementDate(linked.receptionDate)}</dd>
            </div>
            <div>
              <dt>Выполнен</dt>
              <dd>{formatMeasurementDate(linked.executionDate)}</dd>
            </div>
            <div>
              <dt>Заказчик</dt>
              <dd>
                {linked.customerName || '—'}
                {linked.customerPhone ? ` · ${linked.customerPhone}` : ''}
              </dd>
            </div>
            <div>
              <dt>Адрес</dt>
              <dd>{linked.customerAddress || '—'}</dd>
            </div>
            <div>
              <dt>Замерщик</dt>
              <dd>
                {linked.surveyor
                  ? [linked.surveyor.lastName, linked.surveyor.firstName]
                      .filter(Boolean)
                      .join(' ') || '—'
                  : '—'}
              </dd>
            </div>
            <div>
              <dt>Статус</dt>
              <dd>{measurementStatusLabels(linked.status)}</dd>
            </div>
          </dl>
        ) : (
          <p className={link.sectionHint}>
            Замер {linkedMeasurementId} {measurements ? 'не найден в списке замеров.' : '…'}
          </p>
        )}
        {customerMismatch ? (
          <p className={link.errorText} role="alert">
            Замер принадлежит другому заказчику. Проверьте заказчика на вкладке «Данные» или
            отвяжите замер.
          </p>
        ) : null}
        <div className={link.measurementLinkActions}>
          <a
            className={link.measurementLinkOpen}
            href="/admin/measurements"
            target="_blank"
            rel="noopener noreferrer"
          >
            Открыть в «Замерах»
          </a>
          <button
            type="button"
            data-modal-btn="secondary"
            className={link.removeButton}
            onClick={onUnlink}
          >
            Отвязать замер
          </button>
        </div>
      </div>
    );
  }

  if (!linkedCrmCustomerId) {
    return (
      <div className={cardClassName}>
        <h4 className={link.measurementLinkTitle}>Связанный замер</h4>
        <p className={link.sectionHint}>
          {placement === 'data'
            ? 'Сначала выберите заказчика (карточку) в блоке «Поиск заказчика в базе» выше — после этого можно связать договор с его замером.'
            : 'Сначала выберите заказчика (карточку) на вкладке «Данные» — после этого здесь можно связать договор с его замером.'}
        </p>
      </div>
    );
  }

  return (
    <div className={cardClassName}>
      <h4 className={link.measurementLinkTitle}>Связанный замер</h4>
      <p className={link.sectionHint}>
        {placement === 'data'
          ? 'Показаны замеры заказчика, выбранного выше. Этот же выбор отображается на вкладке «Замер».'
          : 'Показаны замеры заказчика, выбранного на вкладке «Данные». Связь появится в списке замеров («Договор создан») и в фильтрах по направлениям.'}
      </p>
      <div className={link.measurementLinkPickerRow}>
        <select
          className={link.measurementLinkSelect}
          value={selectedId}
          disabled={measurements === null || customerMeasurements.length === 0}
          onChange={(e) => setSelectedId(e.target.value)}
          aria-label="Замер для связи"
        >
          <option value="">
            {measurements === null
              ? 'Загрузка…'
              : customerMeasurements.length === 0
                ? 'У этого заказчика нет замеров'
                : `Выберите замер (${customerMeasurements.length})`}
          </option>
          {customerMeasurements.map((m) => (
            <option key={m.id} value={m.id}>
              {measurementPickerLabel(m)}
            </option>
          ))}
        </select>
        <button
          type="button"
          data-modal-btn="primary"
          className={link.linkButton}
          disabled={!selectedId}
          onClick={() => {
            if (selectedId) onLink(selectedId);
            setSelectedId('');
          }}
        >
          Связать
        </button>
      </div>
    </div>
  );
}
