'use client';

import { useMemo, useRef } from 'react';

import type { ContractDocumentPackage } from '@/shared/api/admin-contract-document-packages';
import { type InstallerMaster } from '@/shared/api/admin-crm';
import { PackageOrderSearch } from '@/views/admin/CRM/shared/PackageOrderSearch';
import {
  packageAssignedInstallerIds,
  packageFormFields,
  packageSearchLabel,
} from '@/views/admin/CRM/shared/PackageOrderSearch';

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

export function InstallationScheduleForm({ values, onChange, installers, error }: Props) {
  /** Значения полей до автозаполнения заказом — «Снять выбор» возвращает их. */
  const packagePrevFieldsRef = useRef<{
    direction: InstallationScheduleFormValues['direction'];
    installerIds: string[];
    contractNumber: string;
    customerName: string;
    customerAddress: string;
    customerPhones: string[];
  } | null>(null);

  const filteredInstallers = useMemo(
    () => installers.filter((installer) => installer.directions?.includes(values.direction)),
    [installers, values.direction]
  );

  const update = (patch: Partial<InstallationScheduleFormValues>) =>
    onChange({ ...values, ...patch });

  const clearPackage = () => {
    const restore = packagePrevFieldsRef.current;
    packagePrevFieldsRef.current = null;
    update({
      packageId: '',
      packageSearch: '',
      workOrderKey: '',
      workOrderLabel: '',
      ...(restore
        ? {
            direction: restore.direction,
            installerIds: restore.installerIds,
            contractNumber: restore.contractNumber,
            customerName: restore.customerName,
            customerAddress: restore.customerAddress,
            customerPhones: restore.customerPhones.length > 0 ? restore.customerPhones : [''],
          }
        : {
            contractNumber: '',
            customerName: '',
            customerAddress: '',
            customerPhones: [''],
          }),
    });
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
        installer.directions?.includes(nextDirection) &&
        (assignedIds.size === 0 || assignedIds.has(installer.id))
    );
    const nextInstallerIds =
      assignedIds.size > 0
        ? matchingInstallers.map((row) => row.id)
        : values.direction === nextDirection
          ? values.installerIds
          : [];

    // при первом выборе запоминаем, что было в полях до автозаполнения
    if (!values.packageId) {
      packagePrevFieldsRef.current = {
        direction: values.direction,
        installerIds: values.installerIds,
        contractNumber: values.contractNumber,
        customerName: values.customerName,
        customerAddress: values.customerAddress,
        customerPhones: values.customerPhones,
      };
    }

    update({
      packageId: pkg.id,
      packageSearch: packageSearchLabel(pkg),
      direction: nextDirection,
      installerIds: values.manualInstaller ? [] : nextInstallerIds,
      ...(values.manualInstaller || nextInstallerIds.length || values.direction === nextDirection
        ? {}
        : { manualInstallerNames: [''] }),
      contractNumber: fields.contractNumber,
      customerName: fields.customerName,
      customerAddress: fields.displayAddress,
      customerPhones:
        fields.customerPhones.length > 0 ? fields.customerPhones : values.customerPhones,
      workOrderKey: 'workOrder',
      workOrderLabel: 'Заказ-наряд',
    });
  };

  const toggleInstaller = (installerId: string) => {
    const selected = values.installerIds.includes(installerId)
      ? values.installerIds.filter((id) => id !== installerId)
      : [...values.installerIds, installerId];
    update({ installerIds: selected, manualInstaller: false });
  };

  return (
    <>
      <PackageOrderSearch
        id="is-package"
        searchValue={values.packageSearch}
        selectedPackageId={values.packageId}
        onSearchChange={(packageSearch) =>
          update({
            packageSearch,
            packageId: '',
            workOrderKey: '',
            workOrderLabel: '',
          })
        }
        onSelect={selectPackage}
        onClear={clearPackage}
      />

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
            <label htmlFor="is-from">Время с *</label>
            <input
              id="is-from"
              type="time"
              value={values.timeFrom}
              onChange={(e) => update({ timeFrom: e.target.value })}
              required
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
              <label htmlFor="is-contract">Номер договора *</label>
              <input
                id="is-contract"
                value={values.contractNumber}
                onChange={(e) => update({ contractNumber: e.target.value })}
                required
              />
            </div>
            <div className={`${styles.compactField} ${styles.compactFieldGrow}`}>
              <label htmlFor="is-customer">Заказчик *</label>
              <input
                id="is-customer"
                value={values.customerName}
                onChange={(e) => update({ customerName: e.target.value })}
                required
              />
            </div>
          </div>
          <div className={styles.compactField}>
            <label htmlFor="is-address">Адрес *</label>
            <input
              id="is-address"
              value={values.customerAddress}
              onChange={(e) => update({ customerAddress: e.target.value })}
              required
            />
          </div>
          <div className={styles.compactField}>
            <label>Телефоны *</label>
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
                    required={index === 0}
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
            <label htmlFor="is-order">Информация по заказу *</label>
            <textarea
              id="is-order"
              rows={2}
              value={values.orderInfo}
              onChange={(e) => update({ orderInfo: e.target.value })}
              required
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
