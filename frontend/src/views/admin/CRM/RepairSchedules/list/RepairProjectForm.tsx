'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import styles from '../shared/RepairSchedules.module.css';
import {
  REPAIR_STATUS_LABELS,
  type RepairProjectFormValues,
  fieldsFromPackage,
} from '../shared/repair-schedules';

type Props = {
  values: RepairProjectFormValues;
  onChange: (values: RepairProjectFormValues) => void;
  installers: InstallerMaster[];
  error: string | null;
};

export function RepairProjectForm({ values, onChange, installers, error }: Props) {
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);

  const update = (patch: Partial<RepairProjectFormValues>) => onChange({ ...values, ...patch });

  useEffect(() => {
    const q = values.packageSearch.trim();
    if (q.length < 2 || values.packageId) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void getContractDocumentPackages({ search: q, kind: 'REPAIR', limit: 6 })
        .then(setHits)
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [values.packageSearch, values.packageId]);

  const applyPackage = (pkg: ContractDocumentPackage) => {
    update(fieldsFromPackage(pkg));
    setHits([]);
  };

  return (
    <div data-modal-form-grid>
      <div data-modal-form-group>
        <label htmlFor="rs-status">Статус</label>
        <select
          id="rs-status"
          value={values.status}
          onChange={(e) => update({ status: e.target.value as RepairProjectFormValues['status'] })}
        >
          {(Object.keys(REPAIR_STATUS_LABELS) as Array<keyof typeof REPAIR_STATUS_LABELS>).map(
            (key) => (
              <option key={key} value={key}>
                {REPAIR_STATUS_LABELS[key]}
              </option>
            )
          )}
        </select>
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-number">№ договора</label>
        <input
          id="rs-number"
          value={values.contractNumber}
          onChange={(e) => update({ contractNumber: e.target.value })}
          placeholder="77р-183"
        />
      </div>

      <div data-modal-form-group className={styles.createFormSpan}>
        <div className={styles.createFormLabelRow}>
          <label htmlFor="rs-package">Пакет / договор</label>
          {values.packageId ? (
            <button
              type="button"
              className={styles.createFormLinkBtn}
              onClick={() =>
                update({
                  packageId: '',
                  packageSearch: '',
                  contractId: '',
                })
              }
            >
              Отвязать
            </button>
          ) : null}
          {searching ? <span className={styles.createFormInlineHint}>Поиск…</span> : null}
        </div>
        <input
          id="rs-package"
          value={values.packageSearch}
          onChange={(e) => update({ packageSearch: e.target.value, packageId: '', contractId: '' })}
          placeholder="Номер, ФИО, адрес…"
        />
        {hits.length > 0 ? (
          <ul className={styles.contractHits}>
            {hits.map((pkg) => (
              <li key={pkg.id}>
                <button type="button" onClick={() => applyPackage(pkg)}>
                  {pkg.crmContract?.contractNumber || pkg.title || pkg.id}
                  {pkg.crmContract?.customerName ? ` · ${pkg.crmContract.customerName}` : ''}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-scope">Объём работ</label>
        <input
          id="rs-scope"
          value={values.workScope}
          onChange={(e) => update({ workScope: e.target.value })}
          placeholder="санузел, малярка…"
        />
      </div>

      <div data-modal-form-group>
        <div className={styles.createFormLabelRow}>
          <label htmlFor="rs-installer">Мастер</label>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={values.manualInstaller}
              onChange={(e) =>
                update({
                  manualInstaller: e.target.checked,
                  installerId: e.target.checked ? '' : values.installerId,
                  installerName: e.target.checked ? values.installerName : '',
                })
              }
            />
            Вручную
          </label>
        </div>
        {values.manualInstaller ? (
          <input
            id="rs-installer"
            value={values.installerName}
            onChange={(e) => update({ installerName: e.target.value })}
            placeholder="ФИО мастера"
          />
        ) : (
          <select
            id="rs-installer"
            value={values.installerId}
            onChange={(e) => {
              const installer = installers.find((row) => row.id === e.target.value);
              update({
                installerId: e.target.value,
                installerName: installer?.fullName || '',
              });
            }}
          >
            <option value="">Из справочника</option>
            {installers.map((i) => (
              <option key={i.id} value={i.id}>
                {i.fullName}
                {i.grade && i.grade !== '—' ? ` · ${i.grade}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-customer">Заказчик</label>
        <input
          id="rs-customer"
          value={values.customerName}
          onChange={(e) => update({ customerName: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-phone">Телефон</label>
        <input
          id="rs-phone"
          value={values.customerPhone}
          onChange={(e) => update({ customerPhone: e.target.value })}
        />
      </div>

      <div data-modal-form-group className={styles.createFormSpan}>
        <label htmlFor="rs-address">Адрес</label>
        <input
          id="rs-address"
          value={values.customerAddress}
          onChange={(e) => update({ customerAddress: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-sum">Стоимость договора</label>
        <input
          id="rs-sum"
          type="number"
          min={0}
          value={values.contractSum}
          onChange={(e) => update({ contractSum: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-prepay">Предоплата по договору</label>
        <input
          id="rs-prepay"
          type="number"
          min={0}
          value={values.payoutSum}
          onChange={(e) => update({ payoutSum: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-start">Начало работ</label>
        <input
          id="rs-start"
          type="date"
          value={values.plannedStartDate}
          onChange={(e) => update({ plannedStartDate: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-note">Примечание</label>
        <input
          id="rs-note"
          value={values.note}
          onChange={(e) => update({ note: e.target.value })}
        />
      </div>

      {error ? (
        <p data-modal-form-error className={styles.createFormSpan}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
