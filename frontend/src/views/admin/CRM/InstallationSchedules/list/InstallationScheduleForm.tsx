'use client';

import { useEffect, useMemo, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import { type InstallerMaster } from '@/shared/api/admin-crm';
import {
  type InstallationWorkOrderOption,
  getInstallationWorkOrders,
} from '@/shared/api/crm/admin-installation-schedules';
import {
  DIRECTION_LABELS,
  DIRECTION_OPTIONS,
} from '@/views/admin/CRM/Installers/installers-page.constants';

import styles from '../shared/InstallationSchedules.module.css';
import type { InstallationScheduleFormValues } from '../shared/installation-schedules';

type Props = {
  values: InstallationScheduleFormValues;
  onChange: (values: InstallationScheduleFormValues) => void;
  installers: InstallerMaster[];
  error: string | null;
};

export function InstallationScheduleForm({ values, onChange, installers, error }: Props) {
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);
  const [workOrders, setWorkOrders] = useState<InstallationWorkOrderOption[]>([]);
  const filteredInstallers = useMemo(
    () => installers.filter((installer) => installer.direction === values.direction),
    [installers, values.direction]
  );

  useEffect(() => {
    if (!values.packageSearch.trim() || values.packageId) return setHits([]);
    const timer = window.setTimeout(() => {
      setSearching(true);
      void getContractDocumentPackages({ search: values.packageSearch.trim(), limit: 10 })
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [values.packageId, values.packageSearch]);

  useEffect(() => {
    if (!values.packageId) return setWorkOrders([]);
    void getInstallationWorkOrders({
      packageId: values.packageId,
      installerId: values.installerId || undefined,
    })
      .then((result) => setWorkOrders(result.options))
      .catch(() => setWorkOrders([]));
  }, [values.installerId, values.packageId]);

  const update = (patch: Partial<InstallationScheduleFormValues>) =>
    onChange({ ...values, ...patch });
  const selectPackage = (pkg: ContractDocumentPackage) => {
    const contract = pkg.crmContract;
    const formData = (pkg.formData || {}) as Record<string, unknown>;
    const formStr = (key: string) => {
      const value = formData[key];
      return typeof value === 'string' && value.trim() ? value.trim() : '';
    };
    update({
      packageId: pkg.id,
      packageSearch:
        pkg.title || contract?.contractNumber || formStr('contractNumber') || 'Пакет документов',
      contractId: pkg.crmContractId || '',
      contractNumber:
        contract?.contractNumber || formStr('contractNumber') || formStr('dogovorNumber') || '',
      customerName:
        contract?.customerName ||
        formStr('customerName') ||
        formStr('clientFullName') ||
        formStr('fio') ||
        '',
      customerAddress:
        contract?.customerAddress ||
        formStr('customerAddress') ||
        formStr('objectAddress') ||
        formStr('address') ||
        '',
      customerPhones: (() => {
        const phone =
          contract?.customerPhone ||
          formStr('customerPhone') ||
          formStr('clientPhone') ||
          formStr('phone');
        return phone ? [phone] : values.customerPhones;
      })(),
      workOrderKey: '',
      workOrderLabel: '',
    });
    setHits([]);
  };

  return (
    <>
      <div data-modal-form-grid>
        <div data-modal-form-group>
          <label htmlFor="is-date">Дата *</label>
          <input
            id="is-date"
            type="date"
            value={values.date}
            onChange={(e) => update({ date: e.target.value })}
            required
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="is-direction">Направление *</label>
          <select
            id="is-direction"
            value={values.direction}
            onChange={(e) =>
              update({
                direction: e.target.value as InstallationScheduleFormValues['direction'],
                installerId: '',
              })
            }
          >
            {DIRECTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div data-modal-form-group>
          <label htmlFor="is-from">Время с</label>
          <input
            id="is-from"
            type="time"
            value={values.timeFrom}
            onChange={(e) => update({ timeFrom: e.target.value })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="is-to">Время по</label>
          <input
            id="is-to"
            type="time"
            value={values.timeTo}
            onChange={(e) => update({ timeTo: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-time-text">Или текст времени</label>
          <input
            id="is-time-text"
            value={values.timeText}
            onChange={(e) => update({ timeText: e.target.value })}
            placeholder="после 15:00, по согласованию"
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={values.manualInstaller}
              onChange={(e) =>
                update({
                  manualInstaller: e.target.checked,
                  installerId: e.target.checked ? '' : values.installerId,
                })
              }
            />{' '}
            Ввести монтажника вручную
          </label>
          {values.manualInstaller ? (
            <input
              value={values.installerName}
              onChange={(e) => update({ installerName: e.target.value })}
              placeholder="ФИО монтажника"
            />
          ) : (
            <select
              value={values.installerId}
              onChange={(e) => {
                const installer = filteredInstallers.find((row) => row.id === e.target.value);
                update({
                  installerId: e.target.value,
                  installerName: installer?.fullName || '',
                });
              }}
            >
              <option value="">Выберите монтажника</option>
              {filteredInstallers.map((installer) => (
                <option key={installer.id} value={installer.id}>
                  {installer.fullName}
                </option>
              ))}
            </select>
          )}
          {!values.manualInstaller && filteredInstallers.length === 0 ? (
            <span className={styles.fieldHint}>
              Для направления «{DIRECTION_LABELS[values.direction]}» монтажники не найдены.
            </span>
          ) : null}
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-package">Пакет документов</label>
          <input
            id="is-package"
            value={values.packageSearch}
            onChange={(e) =>
              update({
                packageSearch: e.target.value,
                packageId: '',
                contractId: '',
                workOrderKey: '',
              })
            }
            placeholder="Поиск по договору, заказчику или названию"
          />
          {values.packageId ? (
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={() =>
                update({ packageId: '', packageSearch: '', contractId: '', workOrderKey: '' })
              }
            >
              Очистить пакет
            </button>
          ) : null}
          {searching ? <span className={styles.fieldHint}>Поиск…</span> : null}
          {hits.length ? (
            <ul className={styles.contractHits}>
              {hits.map((pkg) => (
                <li key={pkg.id}>
                  <button type="button" onClick={() => selectPackage(pkg)}>
                    {pkg.title || 'Пакет'}
                    {pkg.crmContract?.contractNumber ? ` · ${pkg.crmContract.contractNumber}` : ''}
                    {pkg.crmContract?.customerName ? ` · ${pkg.crmContract.customerName}` : ''}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        {values.packageId ? (
          <div data-modal-form-group data-modal-span>
            <label htmlFor="is-work-order">Заказ-наряд из пакета</label>
            <select
              id="is-work-order"
              value={values.workOrderKey}
              onChange={(e) => {
                const option = workOrders.find((entry) => entry.key === e.target.value);
                update({
                  workOrderKey: e.target.value,
                  workOrderLabel: option?.label || values.workOrderLabel,
                });
              }}
            >
              <option value="">Выберите заказ-наряд</option>
              {workOrders.map((option) => (
                <option key={option.key} value={option.key}>
                  {option.label}
                  {option.assignedToInstaller ? ' · назначено мастеру' : ''}
                </option>
              ))}
            </select>
            {workOrders.length === 0 ? (
              <span className={styles.fieldHint}>
                Для выбранного мастера в пакете нет назначенных заказ-нарядов — укажите вручную ниже
                или очистите пакет.
              </span>
            ) : null}
          </div>
        ) : null}
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-work-order-manual">
            {values.packageId
              ? 'Подпись заказ-наряда / ручной ввод'
              : 'Заказ-наряд вручную (без пакета)'}
          </label>
          <input
            id="is-work-order-manual"
            value={values.workOrderLabel}
            onChange={(e) =>
              update({
                workOrderLabel: e.target.value,
                ...(values.packageId ? {} : { workOrderKey: '', packageId: '', contractId: '' }),
              })
            }
            placeholder="Например: Заказ-наряд, доп. 1"
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="is-contract">Номер договора</label>
          <input
            id="is-contract"
            value={values.contractNumber}
            onChange={(e) => update({ contractNumber: e.target.value, contractId: '' })}
          />
        </div>
        <div data-modal-form-group>
          <label htmlFor="is-customer">Заказчик</label>
          <input
            id="is-customer"
            value={values.customerName}
            onChange={(e) => update({ customerName: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-address">Адрес</label>
          <input
            id="is-address"
            value={values.customerAddress}
            onChange={(e) => update({ customerAddress: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label>Телефоны</label>
          <div className={styles.phoneFields}>
            {values.customerPhones.map((phone, index) => (
              <div className={styles.phoneFieldRow} key={index}>
                <input
                  value={phone}
                  type="tel"
                  onChange={(e) => {
                    const phones = [...values.customerPhones];
                    phones[index] = e.target.value;
                    update({ customerPhones: phones });
                  }}
                />
                {values.customerPhones.length > 1 ? (
                  <button
                    type="button"
                    data-modal-btn="secondary"
                    onClick={() =>
                      update({
                        customerPhones: values.customerPhones.filter((_, i) => i !== index),
                      })
                    }
                  >
                    Удалить
                  </button>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              data-modal-btn="secondary"
              onClick={() => update({ customerPhones: [...values.customerPhones, ''] })}
            >
              + Телефон
            </button>
          </div>
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-order">Информация по заказу</label>
          <textarea
            id="is-order"
            rows={3}
            value={values.orderInfo}
            onChange={(e) => update({ orderInfo: e.target.value })}
          />
        </div>
        <div data-modal-form-group data-modal-span>
          <label htmlFor="is-note">Примечание</label>
          <textarea
            id="is-note"
            rows={2}
            value={values.note}
            onChange={(e) => update({ note: e.target.value })}
          />
        </div>
      </div>
      {error ? <p data-modal-form-error>{error}</p> : null}
    </>
  );
}
