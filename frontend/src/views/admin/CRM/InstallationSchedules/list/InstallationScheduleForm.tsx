'use client';

import { useEffect, useId, useMemo, useState } from 'react';

import {
  type ContractDocumentPackage,
  getContractDocumentPackages,
} from '@/shared/api/admin-contract-document-packages';
import { type InstallerMaster } from '@/shared/api/admin-crm';
import { CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS } from '@/views/admin/ContractDocuments/packages/config';

import styles from '../shared/InstallationSchedules.module.css';
import {
  DIRECTION_LABELS,
  INSTALLATION_SCHEDULE_DIRECTION_OPTIONS,
  type InstallationScheduleFormValues,
} from '../shared/installation-schedules';

type Props = {
  values: InstallationScheduleFormValues;
  onChange: (values: InstallationScheduleFormValues) => void;
  installers: InstallerMaster[];
  error: string | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function trimStr(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function formStrFromPackage(pkg: ContractDocumentPackage, key: string): string {
  const formData = asRecord(pkg.formData) || {};
  return trimStr(formData[key]);
}

/** Nested WINDOWS/DOORS/… formData: contract.*, customer.*, object.* (+ flat legacy keys). */
function packageFormFields(pkg: ContractDocumentPackage) {
  const formData = asRecord(pkg.formData) || {};
  const contract = asRecord(formData.contract) || {};
  const customer = asRecord(formData.customer) || {};
  const object = asRecord(formData.object) || {};
  const crm = pkg.crmContract;

  const contractNumber =
    trimStr(crm?.contractNumber) ||
    trimStr(contract.number) ||
    formStrFromPackage(pkg, 'contractNumber') ||
    formStrFromPackage(pkg, 'dogovorNumber');

  const customerName =
    trimStr(crm?.customerName) ||
    trimStr(customer.fullName) ||
    trimStr(customer.organizationName) ||
    trimStr(customer.representativeFullNameNominative) ||
    formStrFromPackage(pkg, 'customerName') ||
    formStrFromPackage(pkg, 'clientFullName') ||
    formStrFromPackage(pkg, 'fio');

  const customerEmail = trimStr(customer.email) || formStrFromPackage(pkg, 'customerEmail');

  const phoneCandidates: string[] = [];
  const pushPhone = (value: unknown) => {
    const phone = trimStr(value);
    if (phone && !phoneCandidates.includes(phone)) phoneCandidates.push(phone);
  };
  pushPhone(crm?.customerPhone);
  pushPhone(customer.phone);
  if (Array.isArray(customer.phones)) {
    for (const phone of customer.phones) pushPhone(phone);
  }
  pushPhone(formData.customerPhone);
  pushPhone(formData.clientPhone);
  pushPhone(formData.phone);

  const objectAddress =
    trimStr(pkg.documentObject?.address) ||
    trimStr(object.objectAddress) ||
    trimStr(object.address) ||
    formStrFromPackage(pkg, 'objectAddress');

  const customerAddress =
    trimStr(crm?.customerAddress) ||
    trimStr(customer.address) ||
    formStrFromPackage(pkg, 'customerAddress') ||
    formStrFromPackage(pkg, 'address');

  return {
    contractNumber,
    customerName,
    customerEmail,
    customerPhones: phoneCandidates,
    objectAddress,
    customerAddress,
    displayAddress: objectAddress || customerAddress,
  };
}

function packageAssignedInstallerIds(pkg: ContractDocumentPackage): string[] {
  const raw = asRecord(pkg.formData) || {};
  const list = raw.selectedRepairInstallerIds;
  if (!Array.isArray(list)) return [];
  return list.map((id) => (typeof id === 'string' ? id.trim() : '')).filter(Boolean);
}

function packageResultTitle(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  return (
    fields.customerName ||
    (fields.contractNumber ? `Договор №${fields.contractNumber}` : '') ||
    trimStr(pkg.title) ||
    'Заказ'
  );
}

function packageResultMeta(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  const kindLabel = CONTRACT_DOCUMENT_PACKAGE_KIND_LABELS[pkg.kind] ?? pkg.kind;
  return [
    fields.customerPhones[0] || null,
    fields.customerEmail || null,
    kindLabel,
    fields.contractNumber ? `№${fields.contractNumber}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function packageResultAddress(pkg: ContractDocumentPackage): string {
  return packageFormFields(pkg).displayAddress;
}

function packageSearchLabel(pkg: ContractDocumentPackage): string {
  const fields = packageFormFields(pkg);
  return (
    [fields.customerName, fields.contractNumber ? `№${fields.contractNumber}` : null]
      .filter(Boolean)
      .join(' · ') || packageResultTitle(pkg)
  );
}

export function InstallationScheduleForm({ values, onChange, installers, error }: Props) {
  const listboxId = useId();
  const [hits, setHits] = useState<ContractDocumentPackage[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  /** Поиск только после действий пользователя — не при открытии «Изменить» с уже заполненным текстом. */
  const [searchInteractive, setSearchInteractive] = useState(false);
  const filteredInstallers = useMemo(
    () => installers.filter((installer) => installer.direction === values.direction),
    [installers, values.direction]
  );

  useEffect(() => {
    if (values.packageId) {
      setDebouncedSearch('');
      setSearchInteractive(false);
      return;
    }
    if (!searchInteractive) {
      setDebouncedSearch('');
      return;
    }
    const query = values.packageSearch.trim();
    const timer = window.setTimeout(() => setDebouncedSearch(query), 380);
    return () => window.clearTimeout(timer);
  }, [values.packageId, values.packageSearch, searchInteractive]);

  useEffect(() => {
    if (values.packageId || debouncedSearch.length < 2) {
      setHits([]);
      setSearching(false);
      setSearchError(null);
      return;
    }
    let cancelled = false;
    setSearching(true);
    setSearchError(null);
    void getContractDocumentPackages({ search: debouncedSearch, limit: 30 })
      .then((rows) => {
        if (!cancelled) setHits(rows);
      })
      .catch(() => {
        if (!cancelled) {
          setHits([]);
          setSearchError('Не удалось выполнить поиск заказа');
        }
      })
      .finally(() => {
        if (!cancelled) setSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, values.packageId]);

  const update = (patch: Partial<InstallationScheduleFormValues>) =>
    onChange({ ...values, ...patch });

  const clearPackage = () => {
    setSearchInteractive(false);
    update({
      packageId: '',
      packageSearch: '',
      contractId: '',
      workOrderKey: '',
      workOrderLabel: '',
    });
    setHits([]);
    setSearchError(null);
  };

  const selectPackage = (pkg: ContractDocumentPackage) => {
    const fields = packageFormFields(pkg);
    const directionFromKind =
      pkg.kind !== 'REPAIR' &&
      INSTALLATION_SCHEDULE_DIRECTION_OPTIONS.some((option) => option.value === pkg.kind)
        ? (pkg.kind as InstallationScheduleFormValues['direction'])
        : null;
    const nextDirection = directionFromKind ?? values.direction;
    const assignedIds = new Set(packageAssignedInstallerIds(pkg));
    const matchingInstallers = installers.filter(
      (installer) =>
        installer.direction === nextDirection &&
        (assignedIds.size === 0 || assignedIds.has(installer.id))
    );
    const nextInstallerIds =
      assignedIds.size > 0
        ? matchingInstallers.map((row) => row.id)
        : values.direction === nextDirection
          ? values.installerIds
          : [];

    setSearchInteractive(false);
    update({
      packageId: pkg.id,
      packageSearch: packageSearchLabel(pkg),
      direction: nextDirection,
      installerIds: values.manualInstaller ? [] : nextInstallerIds,
      ...(values.manualInstaller || nextInstallerIds.length || values.direction === nextDirection
        ? {}
        : { manualInstallerNames: [''] }),
      contractId: pkg.crmContractId || '',
      contractNumber: fields.contractNumber,
      customerName: fields.customerName,
      customerAddress: fields.displayAddress,
      customerPhones:
        fields.customerPhones.length > 0 ? fields.customerPhones : values.customerPhones,
      workOrderKey: 'workOrder',
      workOrderLabel: 'Заказ-наряд',
    });
    setHits([]);
    setSearchError(null);
  };

  const toggleInstaller = (installerId: string) => {
    const selected = values.installerIds.includes(installerId)
      ? values.installerIds.filter((id) => id !== installerId)
      : [...values.installerIds, installerId];
    update({ installerIds: selected, manualInstaller: false });
  };

  const showOrderDropdown = searchInteractive && !values.packageId && debouncedSearch.length >= 2;

  return (
    <>
      <article className={styles.orderSearchPanel}>
        <div className={styles.orderSearchPanelHead}>
          <div>
            <h3 className={styles.orderSearchTitle}>Поиск заказа</h3>
            <p className={styles.orderSearchHint}>
              Найдите пакет по договору, заказчику или названию (от 2 символов)
            </p>
          </div>
          {values.packageId ? (
            <span className={styles.orderSearchLinkedBadge}>Заказ выбран</span>
          ) : null}
        </div>
        <div className={styles.orderSearchWrap}>
          <div className={styles.orderSearchRow}>
            <input
              id="is-package"
              type="search"
              className={styles.orderSearchInput}
              value={values.packageSearch}
              onChange={(e) => {
                setSearchInteractive(true);
                update({
                  packageSearch: e.target.value,
                  packageId: '',
                  contractId: '',
                  workOrderKey: '',
                  workOrderLabel: '',
                });
              }}
              placeholder="Поиск: договор, заказчик, название…"
              autoComplete="off"
              aria-label="Поиск заказа по договору, заказчику или названию (от 2 символов)"
              aria-expanded={showOrderDropdown}
              aria-controls={listboxId}
            />
            {values.packageId || values.packageSearch ? (
              <button
                type="button"
                className={styles.orderSearchClearButton}
                onClick={clearPackage}
              >
                Снять выбор
              </button>
            ) : null}
          </div>
          {showOrderDropdown ? (
            <div className={styles.orderSearchDropdown} id={listboxId} role="presentation">
              {searching ? <p className={styles.orderSearchMuted}>Поиск…</p> : null}
              {!searching && searchError ? (
                <p className={styles.orderSearchError}>{searchError}</p>
              ) : null}
              {!searching && !searchError && hits.length === 0 ? (
                <p className={styles.orderSearchMuted}>Ничего не найдено</p>
              ) : null}
              {!searching && !searchError && hits.length > 0 ? (
                <ul
                  className={styles.orderSearchResults}
                  role="listbox"
                  aria-label="Результаты поиска заказа"
                >
                  {hits.map((pkg) => {
                    const address = packageResultAddress(pkg);
                    const meta = packageResultMeta(pkg);
                    return (
                      <li key={pkg.id} role="option" className={styles.orderSearchResultItem}>
                        <button
                          type="button"
                          className={styles.orderSearchResultButton}
                          onClick={() => selectPackage(pkg)}
                        >
                          <span className={styles.orderSearchResultName}>
                            {packageResultTitle(pkg)}
                          </span>
                          {meta ? (
                            <span className={styles.orderSearchResultMeta}>{meta}</span>
                          ) : null}
                          {address ? (
                            <span className={styles.orderSearchResultAddress}>
                              Объект: {address}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <section className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Дата и время</h3>
        <div className={styles.compactFieldsRow}>
          <div className={`${styles.compactField} ${styles.compactFieldDate}`}>
            <label htmlFor="is-date">Дата с *</label>
            <input
              id="is-date"
              type="date"
              value={values.date}
              onChange={(e) => {
                const date = e.target.value;
                update({
                  date,
                  dateEnd: values.dateEnd && values.dateEnd < date ? date : values.dateEnd,
                });
              }}
              required
            />
          </div>
          <div className={`${styles.compactField} ${styles.compactFieldDate}`}>
            <label htmlFor="is-date-end">Дата по</label>
            <input
              id="is-date-end"
              type="date"
              value={values.dateEnd}
              min={values.date || undefined}
              onChange={(e) => update({ dateEnd: e.target.value })}
            />
          </div>
          <div className={`${styles.compactField} ${styles.compactFieldTime}`}>
            <label htmlFor="is-from">Время с</label>
            <input
              id="is-from"
              type="time"
              value={values.timeFrom}
              onChange={(e) => update({ timeFrom: e.target.value })}
            />
          </div>
          <div className={`${styles.compactField} ${styles.compactFieldTime}`}>
            <label htmlFor="is-to">Время по</label>
            <input
              id="is-to"
              type="time"
              value={values.timeTo}
              onChange={(e) => update({ timeTo: e.target.value })}
            />
          </div>
          <div className={`${styles.compactField} ${styles.compactFieldGrow}`}>
            <label htmlFor="is-time-text">Или текст</label>
            <input
              id="is-time-text"
              value={values.timeText}
              onChange={(e) => update({ timeText: e.target.value })}
              placeholder="после 15:00"
            />
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Направление и монтажники</h3>
        <div className={styles.directionInstallerRow}>
          <div className={styles.directionField}>
            <label htmlFor="is-direction">Направление *</label>
            <select
              id="is-direction"
              value={values.direction}
              onChange={(e) =>
                update({
                  direction: e.target.value as InstallationScheduleFormValues['direction'],
                  installerIds: [],
                })
              }
            >
              {INSTALLATION_SCHEDULE_DIRECTION_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className={styles.installerField}>
            <div className={styles.installerFieldHead}>
              <label>Монтажники *</label>
              <label className={styles.checkLabelInline}>
                <input
                  type="checkbox"
                  checked={values.manualInstaller}
                  onChange={(e) =>
                    update({
                      manualInstaller: e.target.checked,
                      installerIds: e.target.checked ? [] : values.installerIds,
                      manualInstallerNames: e.target.checked
                        ? values.manualInstallerNames.length
                          ? values.manualInstallerNames
                          : ['']
                        : [''],
                    })
                  }
                />{' '}
                Вручную
              </label>
            </div>
            {values.manualInstaller ? (
              <div className={styles.manualInstallerList}>
                {values.manualInstallerNames.map((name, index) => (
                  <div className={styles.inlinePhoneRow} key={index}>
                    <input
                      value={name}
                      onChange={(e) => {
                        const manualInstallerNames = [...values.manualInstallerNames];
                        manualInstallerNames[index] = e.target.value;
                        update({ manualInstallerNames });
                      }}
                      placeholder="ФИО монтажника"
                    />
                    {values.manualInstallerNames.length > 1 ? (
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        onClick={() =>
                          update({
                            manualInstallerNames: values.manualInstallerNames.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                      >
                        ×
                      </button>
                    ) : null}
                    {index === values.manualInstallerNames.length - 1 ? (
                      <button
                        type="button"
                        data-modal-btn="secondary"
                        onClick={() =>
                          update({
                            manualInstallerNames: [...values.manualInstallerNames, ''],
                          })
                        }
                      >
                        +
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.installerChecklist}>
                {filteredInstallers.length === 0 ? (
                  <span className={styles.fieldHint}>
                    Для направления «{DIRECTION_LABELS[values.direction]}» монтажники не найдены.
                  </span>
                ) : (
                  filteredInstallers.map((installer) => (
                    <label key={installer.id} className={styles.installerCheckItem}>
                      <input
                        type="checkbox"
                        checked={values.installerIds.includes(installer.id)}
                        onChange={() => toggleInstaller(installer.id)}
                      />
                      <span>{installer.fullName}</span>
                    </label>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Заказчик</h3>
        <div className={styles.customerFields}>
          <div className={styles.customerTopRow}>
            <div className={styles.compactField}>
              <label htmlFor="is-contract">Номер договора</label>
              <input
                id="is-contract"
                value={values.contractNumber}
                onChange={(e) => update({ contractNumber: e.target.value, contractId: '' })}
              />
            </div>
            <div className={`${styles.compactField} ${styles.compactFieldGrow}`}>
              <label htmlFor="is-customer">Заказчик</label>
              <input
                id="is-customer"
                value={values.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
              />
            </div>
          </div>
          <div className={styles.compactField}>
            <label htmlFor="is-address">Адрес</label>
            <input
              id="is-address"
              value={values.customerAddress}
              onChange={(e) => update({ customerAddress: e.target.value })}
            />
          </div>
          <div className={styles.compactField}>
            <label>Телефоны</label>
            <div className={styles.inlinePhoneRow}>
              {values.customerPhones.map((phone, index) => (
                <div className={styles.inlinePhoneItem} key={index}>
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
                      ×
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
        </div>
      </section>

      <section className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Контактные лица</h3>
        <p className={styles.formSectionHint}>
          Если монтажников принимает не заказчик — укажите контакт на объекте
        </p>
        <div className={styles.contactPersons}>
          {values.contactPersons.map((person, personIndex) => (
            <div className={styles.contactPersonCard} key={personIndex}>
              <div className={styles.contactPersonHeader}>
                <strong>Контакт {personIndex + 1}</strong>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  onClick={() =>
                    update({
                      contactPersons: values.contactPersons.filter((_, i) => i !== personIndex),
                    })
                  }
                >
                  Удалить
                </button>
              </div>
              <div className={styles.contactPersonFields}>
                <div className={`${styles.compactField} ${styles.compactFieldMid}`}>
                  <label htmlFor={`is-contact-name-${personIndex}`}>ФИО</label>
                  <input
                    id={`is-contact-name-${personIndex}`}
                    value={person.name}
                    onChange={(e) => {
                      const contactPersons = [...values.contactPersons];
                      contactPersons[personIndex] = { ...person, name: e.target.value };
                      update({ contactPersons });
                    }}
                    placeholder="ФИО"
                  />
                </div>
                <div className={`${styles.compactField} ${styles.compactFieldGrow}`}>
                  <label>Телефоны</label>
                  <div className={styles.inlinePhoneRow}>
                    {person.phones.map((phone, phoneIndex) => (
                      <div className={styles.inlinePhoneItem} key={phoneIndex}>
                        <input
                          value={phone}
                          type="tel"
                          onChange={(e) => {
                            const contactPersons = [...values.contactPersons];
                            const phones = [...person.phones];
                            phones[phoneIndex] = e.target.value;
                            contactPersons[personIndex] = { ...person, phones };
                            update({ contactPersons });
                          }}
                        />
                        {person.phones.length > 1 ? (
                          <button
                            type="button"
                            data-modal-btn="secondary"
                            onClick={() => {
                              const contactPersons = [...values.contactPersons];
                              contactPersons[personIndex] = {
                                ...person,
                                phones: person.phones.filter((_, i) => i !== phoneIndex),
                              };
                              update({ contactPersons });
                            }}
                          >
                            ×
                          </button>
                        ) : null}
                      </div>
                    ))}
                    <button
                      type="button"
                      data-modal-btn="secondary"
                      onClick={() => {
                        const contactPersons = [...values.contactPersons];
                        contactPersons[personIndex] = {
                          ...person,
                          phones: [...person.phones, ''],
                        };
                        update({ contactPersons });
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
          <button
            type="button"
            data-modal-btn="secondary"
            onClick={() =>
              update({
                contactPersons: [...values.contactPersons, { name: '', phones: [''] }],
              })
            }
          >
            + Контактное лицо
          </button>
        </div>
      </section>

      <section className={styles.formSection}>
        <h3 className={styles.formSectionTitle}>Дополнительно</h3>
        <div className={styles.extraFields}>
          <div className={styles.compactField}>
            <label htmlFor="is-order">Информация по заказу</label>
            <textarea
              id="is-order"
              rows={2}
              value={values.orderInfo}
              onChange={(e) => update({ orderInfo: e.target.value })}
            />
          </div>
          <div className={styles.compactField}>
            <label htmlFor="is-note">Примечание</label>
            <textarea
              id="is-note"
              rows={2}
              value={values.note}
              onChange={(e) => update({ note: e.target.value })}
            />
          </div>
        </div>
      </section>

      {error ? <p data-modal-form-error>{error}</p> : null}
    </>
  );
}
