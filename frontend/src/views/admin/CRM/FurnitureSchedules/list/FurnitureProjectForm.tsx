'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import type { InstallerMaster } from '@/shared/api/admin-crm';

import styles from '../shared/FurnitureSchedules.module.css';
import {
  FURNITURE_STATUS_LABELS,
  type FurnitureProjectFormValues,
  fieldsFromPackage,
} from '../shared/furniture-schedules';

type Props = {
  values: FurnitureProjectFormValues;
  onChange: (values: FurnitureProjectFormValues) => void;
  installers: InstallerMaster[];
  error: string | null;
};

export function FurnitureProjectForm({ values, onChange, installers, error }: Props) {
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);

  const update = (patch: Partial<FurnitureProjectFormValues>) => onChange({ ...values, ...patch });

  useEffect(() => {
    const q = values.packageSearch.trim();
    if (q.length < 2 || values.packageId) {
      setHits([]);
      return;
    }
    const timer = window.setTimeout(() => {
      setSearching(true);
      void getContractDocumentPackages({ search: q, kind: 'FURNITURE', limit: 6 })
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
          onChange={(e) =>
            update({ status: e.target.value as FurnitureProjectFormValues['status'] })
          }
        >
          {(
            Object.keys(FURNITURE_STATUS_LABELS) as Array<keyof typeof FURNITURE_STATUS_LABELS>
          ).map((key) => (
            <option key={key} value={key}>
              {FURNITURE_STATUS_LABELS[key]}
            </option>
          ))}
        </select>
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-number">№ изготовления</label>
        <input
          id="rs-number"
          value={values.contractNumber}
          onChange={(e) => update({ contractNumber: e.target.value })}
          placeholder="19м-150"
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-install-num">№ монтаж</label>
        <input
          id="rs-install-num"
          value={values.installationContractNumber}
          onChange={(e) => update({ installationContractNumber: e.target.value })}
          placeholder="19с-150"
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-appliances-num">№ техника</label>
        <input
          id="rs-appliances-num"
          value={values.appliancesContractNumber}
          onChange={(e) => update({ appliancesContractNumber: e.target.value })}
          placeholder="19т-150"
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
        <label htmlFor="rs-scope">Примечание / объём</label>
        <input
          id="rs-scope"
          value={values.workScope}
          onChange={(e) => update({ workScope: e.target.value })}
          placeholder="кухня, шкаф…"
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-repair">Ремонт (связанный)</label>
        <input
          id="rs-repair"
          value={values.repairInfo}
          onChange={(e) => update({ repairInfo: e.target.value })}
          placeholder="наш; потолки…"
        />
      </div>

      <div data-modal-form-group>
        <div className={styles.createFormLabelRow}>
          <label htmlFor="rs-installer">Бригада</label>
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
        <label htmlFor="rs-contract-date">Дата договора</label>
        <input
          id="rs-contract-date"
          type="date"
          value={values.contractDate}
          onChange={(e) => update({ contractDate: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-kz">КЗ</label>
        <input
          id="rs-kz"
          value={values.kzInfo}
          onChange={(e) => update({ kzInfo: e.target.value })}
          placeholder="кз или дата"
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
        <label htmlFor="rs-period">Срок договора (раб. дни)</label>
        <input
          id="rs-period"
          type="number"
          min={1}
          value={values.workPeriodDays}
          onChange={(e) => update({ workPeriodDays: e.target.value })}
          placeholder="60"
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-start-act">Начало срока (с учётом КЗ)</label>
        <input
          id="rs-start-act"
          type="date"
          value={values.workStartActDate}
          onChange={(e) =>
            update({
              workStartActDate: e.target.value,
              plannedStartDate: e.target.value || values.plannedStartDate,
            })
          }
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-close-act">Акт сдачи-приёмки</label>
        <input
          id="rs-close-act"
          type="date"
          value={values.workCloseActDate}
          onChange={(e) => update({ workCloseActDate: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-start">Планируемое начало работ</label>
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
