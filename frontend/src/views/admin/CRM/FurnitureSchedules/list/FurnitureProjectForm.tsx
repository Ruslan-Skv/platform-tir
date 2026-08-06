'use client';

import { useEffect, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import {
  type ContractCustomer,
  type ContractCustomerContractRow,
  type InstallerMaster,
  getContractCustomers,
} from '@/shared/api/admin-crm';

import styles from '../shared/FurnitureSchedules.module.css';
import {
  FURNITURE_STATUS_LABELS,
  type FurnitureProjectFormValues,
  fieldsFromPackage,
  furnitureTermStartHint,
  normalizeFurnitureKzInfo,
  resolveFurnitureTermStartDate,
} from '../shared/furniture-schedules';

type Props = {
  values: FurnitureProjectFormValues;
  onChange: (values: FurnitureProjectFormValues) => void;
  installers: InstallerMaster[];
  error: string | null;
};

function normalizePhone(value: string): string {
  return value.replace(/\D/g, '');
}

function pickCustomerMatch(
  customers: ContractCustomer[],
  name: string,
  phone: string,
  contractId: string
): ContractCustomer | null {
  if (customers.length === 0) return null;
  if (contractId) {
    const byContract = customers.find((c) => c.contracts.some((row) => row.id === contractId));
    if (byContract) return byContract;
  }
  const nameKey = name.trim().toLowerCase();
  const phoneKey = normalizePhone(phone);
  const exact = customers.find((c) => {
    const sameName = c.customerName.trim().toLowerCase() === nameKey;
    if (!sameName) return false;
    if (!phoneKey) return true;
    return normalizePhone(c.customerPhone) === phoneKey;
  });
  if (exact) return exact;
  if (nameKey) {
    const byName = customers.find((c) => c.customerName.trim().toLowerCase() === nameKey);
    if (byName) return byName;
  }
  return customers.length === 1 ? customers[0]! : null;
}

function formatContractPreviewLabel(row: ContractCustomerContractRow): string {
  const number = row.contractNumber?.trim() ? `№ ${row.contractNumber.trim()}` : 'Без номера';
  const direction = row.direction?.name?.trim();
  return direction ? `${number} · ${direction}` : number;
}

export function FurnitureProjectForm({ values, onChange, installers, error }: Props) {
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);
  const [customerContracts, setCustomerContracts] = useState<ContractCustomerContractRow[]>([]);
  const [contractsLoading, setContractsLoading] = useState(false);

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

  useEffect(() => {
    const name = values.customerName.trim();
    const phone = values.customerPhone.trim();
    const phoneDigits = normalizePhone(phone);
    if (name.length < 2 && phoneDigits.length < 6) {
      setCustomerContracts([]);
      setContractsLoading(false);
      return;
    }
    const search = [name, phone].filter(Boolean).join(' ');
    const timer = window.setTimeout(() => {
      setContractsLoading(true);
      void getContractCustomers(search)
        .then(({ customers }) => {
          const match = pickCustomerMatch(customers, name, phone, values.contractId);
          setCustomerContracts(match?.contracts ?? []);
        })
        .catch(() => setCustomerContracts([]))
        .finally(() => setContractsLoading(false));
    }, 300);
    return () => window.clearTimeout(timer);
  }, [values.customerName, values.customerPhone, values.contractId]);

  const applyPackage = (pkg: ContractDocumentPackage) => {
    update(fieldsFromPackage(pkg));
    setHits([]);
  };

  const customerLookupReady =
    values.customerName.trim().length >= 2 || normalizePhone(values.customerPhone).length >= 6;

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

      <div data-modal-form-group className={styles.createFormSpan}>
        <div className={styles.createFormLabelRow}>
          <label>Договоры заказчика</label>
          {contractsLoading ? <span className={styles.createFormInlineHint}>Загрузка…</span> : null}
        </div>
        {!customerLookupReady ? (
          <p className={styles.customerContractsHint}>
            Привяжите пакет или укажите заказчика — покажем номера договоров по всем направлениям
          </p>
        ) : customerContracts.length === 0 && !contractsLoading ? (
          <p className={styles.customerContractsHint}>Договоры с этим заказчиком не найдены</p>
        ) : customerContracts.length > 0 ? (
          <ul className={styles.customerContractsPreview} aria-label="Договоры заказчика">
            {customerContracts.map((row) => (
              <li
                key={row.id}
                className={
                  values.contractId && row.id === values.contractId
                    ? styles.customerContractsPreviewCurrent
                    : undefined
                }
                title={formatContractPreviewLabel(row)}
              >
                {formatContractPreviewLabel(row)}
              </li>
            ))}
          </ul>
        ) : null}
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
          onChange={(e) => {
            const contractDate = e.target.value;
            update({
              contractDate,
              workStartActDate: resolveFurnitureTermStartDate(
                contractDate,
                values.kzInfo,
                values.workStartActDate
              ),
            });
          }}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-kz">КЗ</label>
        <input
          id="rs-kz"
          value={values.kzInfo}
          onChange={(e) => {
            const kzInfo = e.target.value;
            update({
              kzInfo,
              workStartActDate: resolveFurnitureTermStartDate(
                values.contractDate,
                kzInfo,
                values.workStartActDate
              ),
            });
          }}
          onBlur={() => {
            const kzInfo = normalizeFurnitureKzInfo(values.kzInfo);
            if (kzInfo === values.kzInfo) return;
            update({
              kzInfo,
              workStartActDate: resolveFurnitureTermStartDate(
                values.contractDate,
                kzInfo,
                values.workStartActDate
              ),
            });
          }}
          placeholder="кз или дд.мм.гггг"
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
        <label htmlFor="rs-start-act">Начало срока</label>
        <input
          id="rs-start-act"
          type="date"
          value={
            resolveFurnitureTermStartDate(
              values.contractDate,
              values.kzInfo,
              values.workStartActDate
            ) || values.workStartActDate
          }
          readOnly
          title={furnitureTermStartHint(values.contractDate, values.kzInfo)}
        />
        <span className={styles.createFormInlineHint}>
          {furnitureTermStartHint(values.contractDate, values.kzInfo)}
        </span>
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-pause-start">Дата временной остановки</label>
        <input
          id="rs-pause-start"
          type="date"
          value={values.pauseStartDate}
          onChange={(e) => update({ pauseStartDate: e.target.value })}
        />
      </div>

      <div data-modal-form-group>
        <label htmlFor="rs-pause-resume">Дата возобновления срока</label>
        <input
          id="rs-pause-resume"
          type="date"
          value={values.pauseResumeDate}
          onChange={(e) => update({ pauseResumeDate: e.target.value })}
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
