'use client';

import { useEffect, useMemo, useState } from 'react';

import type { Contract, CrmUser } from '@/shared/api/admin-crm';
import {
  type DriverAvailabilityStatus,
  type DriverDeliveryAvailabilityListItem,
  listDriverDeliveryAvailability,
  resolveDriverDeliveryAvailability,
} from '@/shared/api/admin-waybills';

import styles from '../shared/Waybills.module.css';
import {
  firstAvailableDate,
  formatDayChipDate,
  previewDriverSchemeWeek,
} from '../shared/driver-availability.utils';
import type { WaybillFormValues } from '../shared/waybills-page.types';
import {
  WAYBILL_DIRECTION_SUGGESTIONS,
  formatUserLabel,
  todayIsoDate,
} from '../shared/waybills-page.utils';

export type WaybillTaskFormProps = {
  values: WaybillFormValues;
  onChange: (next: WaybillFormValues) => void;
  formError: string | null;
  users: CrmUser[];
  drivers: CrmUser[];
  contractHits: Contract[];
  contractSearching: boolean;
  onSearchContracts: (q: string) => void;
  onApplyContract: (c: Contract) => void;
  onDateBlockedChange?: (blocked: boolean) => void;
};

function resolveDayForDate(scheme: DriverDeliveryAvailabilityListItem['scheme'], date: string) {
  return previewDriverSchemeWeek({ scheme, fromDate: date, days: 1 })[0] ?? null;
}

export function WaybillTaskForm({
  values,
  onChange,
  formError,
  users,
  drivers,
  contractHits,
  contractSearching,
  onSearchContracts,
  onApplyContract,
  onDateBlockedChange,
}: WaybillTaskFormProps) {
  const [availability, setAvailability] = useState<DriverAvailabilityStatus[]>([]);
  const [schemes, setSchemes] = useState<DriverDeliveryAvailabilityListItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void listDriverDeliveryAvailability()
      .then((rows) => {
        if (!cancelled) setSchemes(rows);
      })
      .catch(() => {
        if (!cancelled) setSchemes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!values.date) {
      setAvailability([]);
      return;
    }
    let cancelled = false;
    const t = window.setTimeout(() => {
      void resolveDriverDeliveryAvailability({
        date: values.date,
        timeFrom: values.timeFrom || null,
      })
        .then((rows) => {
          if (!cancelled) setAvailability(rows);
        })
        .catch(() => {
          if (!cancelled) setAvailability([]);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [values.date, values.timeFrom]);

  const selectedScheme = useMemo(() => {
    if (!values.driverUserId) return null;
    return schemes.find((s) => s.user.id === values.driverUserId)?.scheme ?? null;
  }, [schemes, values.driverUserId]);

  const weekPreview = useMemo(
    () =>
      previewDriverSchemeWeek({
        scheme: selectedScheme,
        fromDate: todayIsoDate(),
        days: 7,
      }),
    [selectedScheme]
  );

  const selectedDay = useMemo(() => {
    if (!values.date || !values.driverUserId || !selectedScheme?.isActive) return null;
    return (
      weekPreview.find((d) => d.date === values.date) ??
      resolveDayForDate(selectedScheme, values.date)
    );
  }, [values.date, values.driverUserId, selectedScheme, weekPreview]);

  const dateBlocked = Boolean(selectedDay?.blocked);

  useEffect(() => {
    onDateBlockedChange?.(dateBlocked);
  }, [dateBlocked, onDateBlockedChange]);

  const availabilityById = new Map(availability.map((a) => [a.userId, a]));
  const selectedAvailability = values.driverUserId
    ? availabilityById.get(values.driverUserId)
    : undefined;

  const blockedError = dateBlocked
    ? selectedDay
      ? `Нельзя создать задание на ${selectedDay.date}: у водителя «${selectedDay.label}». Выберите доступный день.`
      : 'Нельзя создать задание в выходной / отпуск / больничный водителя. Выберите доступный день.'
    : null;

  const timeWarning =
    !blockedError &&
    selectedAvailability &&
    selectedAvailability.hasScheme &&
    selectedAvailability.isActive &&
    selectedAvailability.kind === 'ON' &&
    selectedAvailability.outsideWindow
      ? `По схеме водитель доступен ${selectedAvailability.label}. Время задания вне окна — лучше скорректировать.`
      : null;

  const setDriver = (driverUserId: string) => {
    const scheme = schemes.find((s) => s.user.id === driverUserId)?.scheme ?? null;
    const preview = previewDriverSchemeWeek({
      scheme,
      fromDate: todayIsoDate(),
      days: 7,
    });
    const nextDate = firstAvailableDate(preview, values.date) ?? values.date;
    onChange({ ...values, driverUserId, date: nextDate });
  };

  const setDate = (date: string) => {
    if (!values.driverUserId || !selectedScheme?.isActive) {
      onChange({ ...values, date });
      return;
    }
    const day = weekPreview.find((d) => d.date === date) ?? resolveDayForDate(selectedScheme, date);
    if (day?.blocked) return;
    onChange({ ...values, date });
  };

  return (
    <>
      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="wb-driver">Водитель</label>
          <select
            id="wb-driver"
            value={values.driverUserId}
            onChange={(e) => setDriver(e.target.value)}
          >
            <option value="">—</option>
            {(drivers.length ? drivers : users).map((u) => {
              const status = availabilityById.get(u.id);
              const suffix = status?.hasScheme && status.isActive ? ` · ${status.label}` : '';
              return (
                <option key={u.id} value={u.id}>
                  {formatUserLabel(u)}
                  {u.role === 'DRIVER' ? ' (водитель)' : ''}
                  {suffix}
                </option>
              );
            })}
          </select>
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-date">Дата *</label>
          <input
            id="wb-date"
            type="date"
            value={values.date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
          {values.driverUserId && selectedScheme?.isActive ? (
            <>
              <div className={styles.dateChipRow} role="group" aria-label="Доступные дни на неделю">
                {weekPreview.map((day) => (
                  <button
                    key={day.date}
                    type="button"
                    disabled={day.blocked}
                    className={`${styles.dateChip} ${
                      day.blocked
                        ? day.kind === 'VACATION' || day.kind === 'SICK'
                          ? styles.dateChipAbsence
                          : styles.dateChipOff
                        : styles.dateChipOn
                    } ${values.date === day.date ? styles.dateChipSelected : ''}`}
                    title={`${day.date}: ${day.label}`}
                    onClick={() => setDate(day.date)}
                  >
                    <span className={styles.dateChipDate}>{formatDayChipDate(day.date)}</span>
                    <span className={styles.dateChipLabel}>{day.label}</span>
                  </button>
                ))}
              </div>
              <span className={styles.fieldHint}>
                Выходные, отпуск и больничный выбрать нельзя — только доступные дни.
              </span>
            </>
          ) : (
            <span className={styles.fieldHint}>
              Выберите водителя со схемой — появятся доступные дни на неделю.
            </span>
          )}
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-direction">Направление</label>
          <input
            id="wb-direction"
            list="wb-direction-list"
            value={values.direction}
            onChange={(e) => onChange({ ...values, direction: e.target.value })}
            placeholder="двери, бавария…"
          />
          <datalist id="wb-direction-list">
            {WAYBILL_DIRECTION_SUGGESTIONS.map((d) => (
              <option key={d} value={d} />
            ))}
          </datalist>
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-from">Время с</label>
          <input
            id="wb-from"
            type="time"
            value={values.timeFrom}
            onChange={(e) => onChange({ ...values, timeFrom: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-to">Время по</label>
          <input
            id="wb-to"
            type="time"
            value={values.timeTo}
            onChange={(e) => onChange({ ...values, timeTo: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-task">Задание водителю *</label>
          <textarea
            id="wb-task"
            value={values.taskText}
            onChange={(e) => onChange({ ...values, taskText: e.target.value })}
            required
            rows={3}
            placeholder="Склад, счёт, что проверить / купить…"
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-contract">Договор (поиск по номеру)</label>
          <input
            id="wb-contract"
            type="text"
            value={values.contractSearch}
            onChange={(e) => {
              const contractSearch = e.target.value;
              onChange({ ...values, contractSearch, contractId: '' });
              void onSearchContracts(contractSearch);
            }}
            placeholder="371Д-463"
          />
          {contractSearching ? (
            <span className={styles.fieldHint}>Поиск…</span>
          ) : (
            <span className={styles.fieldHint}>
              Выберите договор — подставятся ФИО, адрес и телефон
            </span>
          )}
          {contractHits.length > 0 ? (
            <ul className={styles.contractHits}>
              {contractHits.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => onApplyContract(c)}>
                    {c.contractNumber} — {c.customerName || 'без имени'}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-customer-name">ФИО</label>
          <input
            id="wb-customer-name"
            type="text"
            value={values.customerName}
            onChange={(e) => onChange({ ...values, customerName: e.target.value })}
            placeholder="Иванов Иван Иванович"
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label>Телефоны</label>
          <div className={styles.phoneFields}>
            {values.customerPhones.map((phone, index) => (
              <div key={index} className={styles.phoneFieldRow}>
                <input
                  id={index === 0 ? 'wb-customer-phone' : undefined}
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const customerPhones = [...values.customerPhones];
                    customerPhones[index] = e.target.value;
                    onChange({ ...values, customerPhones });
                  }}
                  placeholder="+7(900)-000-00-00"
                  aria-label={index === 0 ? 'Телефон' : `Телефон ${index + 1}`}
                />
                {values.customerPhones.length > 1 ? (
                  <button
                    data-admin-mutation
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.phoneRemoveBtn}
                    onClick={() => {
                      const customerPhones = values.customerPhones.filter((_, i) => i !== index);
                      onChange({
                        ...values,
                        customerPhones: customerPhones.length > 0 ? customerPhones : [''],
                      });
                    }}
                    aria-label={`Удалить телефон ${index + 1}`}
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            ))}
            <button
              data-admin-mutation
              type="button"
              data-modal-btn="secondary"
              className={styles.phoneAddBtn}
              onClick={() =>
                onChange({ ...values, customerPhones: [...values.customerPhones, ''] })
              }
            >
              + Добавить телефон
            </button>
          </div>
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-customer-address">Адрес</label>
          <input
            id="wb-customer-address"
            type="text"
            value={values.customerAddress}
            onChange={(e) => onChange({ ...values, customerAddress: e.target.value })}
            placeholder="Город, улица, дом…"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-delivery-cost">Стоимость доставки</label>
          <input
            id="wb-delivery-cost"
            type="number"
            step="0.01"
            value={values.deliveryCost}
            onChange={(e) => onChange({ ...values, deliveryCost: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-delivery-payer">Кто платит (доставка)</label>
          <input
            id="wb-delivery-payer"
            type="text"
            value={values.deliveryPayer}
            onChange={(e) => onChange({ ...values, deliveryPayer: e.target.value })}
            placeholder="Заказчик / Привокзальная…"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-movers-cost">Стоимость грузчиков</label>
          <input
            id="wb-movers-cost"
            type="number"
            step="0.01"
            value={values.moversCost}
            onChange={(e) => onChange({ ...values, moversCost: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-movers-payer">Кто платит (грузчики)</label>
          <input
            id="wb-movers-payer"
            type="text"
            value={values.moversPayer}
            onChange={(e) => onChange({ ...values, moversPayer: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="wb-attachments">Файлы для водителя</label>
          <input
            id="wb-attachments"
            type="file"
            multiple
            accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.rtf,.txt"
            onChange={(e) => {
              const picked = Array.from(e.target.files ?? []);
              if (picked.length === 0) return;
              onChange({ ...values, pendingFiles: [...values.pendingFiles, ...picked] });
              e.target.value = '';
            }}
          />
          <span className={styles.fieldHint}>
            PDF, изображения, Word, Excel — до 10 файлов по 25 МБ. Водитель увидит их в «Мой
            маршрут».
          </span>
          {values.existingAttachments.length > 0 || values.pendingFiles.length > 0 ? (
            <ul className={styles.attachmentList}>
              {values.existingAttachments.map((attachment) => (
                <li key={attachment.id} className={styles.attachmentRow}>
                  <a href={attachment.fileUrl} target="_blank" rel="noreferrer">
                    {attachment.fileName}
                  </a>
                  <button
                    data-admin-mutation
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.attachmentRemoveBtn}
                    onClick={() =>
                      onChange({
                        ...values,
                        existingAttachments: values.existingAttachments.filter(
                          (a) => a.id !== attachment.id
                        ),
                        removedAttachmentIds: [...values.removedAttachmentIds, attachment.id],
                      })
                    }
                    aria-label={`Удалить файл ${attachment.fileName}`}
                  >
                    Удалить
                  </button>
                </li>
              ))}
              {values.pendingFiles.map((file, index) => (
                <li key={`${file.name}-${index}`} className={styles.attachmentRow}>
                  <span>
                    {file.name}{' '}
                    <span className={styles.attachmentPendingHint}>
                      (загрузится при сохранении)
                    </span>
                  </span>
                  <button
                    data-admin-mutation
                    type="button"
                    data-modal-btn="secondary"
                    className={styles.attachmentRemoveBtn}
                    onClick={() =>
                      onChange({
                        ...values,
                        pendingFiles: values.pendingFiles.filter((_, i) => i !== index),
                      })
                    }
                    aria-label={`Убрать файл ${file.name}`}
                  >
                    Убрать
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div data-modal-form-group>
          <label htmlFor="wb-responsible">Ответственный</label>
          <select
            id="wb-responsible"
            value={values.responsibleUserId}
            onChange={(e) => onChange({ ...values, responsibleUserId: e.target.value })}
          >
            <option value="">—</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {formatUserLabel(u)}
              </option>
            ))}
          </select>
        </div>
      </div>
      {blockedError ? <p data-modal-form-error>{blockedError}</p> : null}
      {timeWarning ? <p data-modal-form-hint>{timeWarning}</p> : null}
      {formError ? <p data-modal-form-error>{formError}</p> : null}
    </>
  );
}
