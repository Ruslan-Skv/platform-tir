'use client';

import type { ChangeEvent, ReactNode } from 'react';

import type { CrmCustomerEntityType } from '@/shared/api/admin-crm';

import formStyles from './AddCrmCustomerModal.module.css';
import type { CrmCustomerFormState } from './crmCustomerForm';
import type { CrmCustomerFormFieldErrors } from './crmCustomerFormValidation';
import {
  CRM_PHONE_FORMAT_HINT,
  CRM_PHONE_PLACEHOLDER,
  formatCrmPhoneDisplay,
  formatCrmPhoneInput,
} from './crmCustomerPhone';

export type CrmPersonNamePartKey = 'lastName' | 'firstName' | 'patronymic';

export type CrmCustomerFormLocks = {
  entityType: boolean;
  /** Заполненные части ФИО нельзя менять (режим редактирования). */
  personFullName: boolean;
  organizationName: boolean;
  /** Исходные значения ФИО при открытии редактирования — пустые части нельзя заполнить. */
  initialPersonName?: Pick<CrmCustomerFormState, CrmPersonNamePartKey>;
};

function isPersonNamePartLocked(part: CrmPersonNamePartKey, locks: CrmCustomerFormLocks): boolean {
  if (locks.initialPersonName !== undefined) {
    const initial = locks.initialPersonName[part]?.trim() ?? '';
    return Boolean(initial);
  }
  return locks.personFullName;
}

type Props = {
  form: CrmCustomerFormState;
  setForm: React.Dispatch<React.SetStateAction<CrmCustomerFormState>>;
  lockedPhones: readonly string[];
  locks: CrmCustomerFormLocks;
  fieldErrors?: CrmCustomerFormFieldErrors;
  onClearFieldError?: (key: string) => void;
  idPrefix?: string;
  showEntityType?: boolean;
  /** Показывать * у обязательных полей (режим создания). */
  showRequiredMarks?: boolean;
  /** Фамилия, имя, отчество и e-mail в одну строку (редактирование карточки). */
  personNameEmailSingleRow?: boolean;
};

function FieldWrap({
  id,
  label,
  error,
  required,
  children,
}: {
  id: string;
  label: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div data-modal-form-group>
      <label htmlFor={id}>
        {label}
        {required ? ' *' : null}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className={formStyles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function invalidClass(hasError: boolean): string {
  return hasError ? formStyles.inputInvalid : '';
}

export function CrmCustomerFormFields({
  form,
  setForm,
  lockedPhones,
  locks,
  fieldErrors = {},
  onClearFieldError,
  idPrefix = 'crm',
  showEntityType = true,
  showRequiredMarks = false,
  personNameEmailSingleRow = false,
}: Props) {
  const err = (key: string) => fieldErrors[key];
  const inputProps = (key: string) => ({
    'aria-invalid': err(key) ? true : undefined,
    'aria-describedby': err(key) ? `${idPrefix}-${key}-error` : undefined,
    className: invalidClass(Boolean(err(key))),
  });

  const set =
    <K extends keyof CrmCustomerFormState>(key: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      onClearFieldError?.(String(key));
      const v = e.target.value;
      setForm((prev) => ({ ...prev, [key]: v }) as CrmCustomerFormState);
    };

  const updateNewPhoneAt = (index: number, value: string) => {
    onClearFieldError?.(`phones.${index}`);
    onClearFieldError?.('phones');
    setForm((prev) => {
      const phones = [...prev.phones];
      phones[index] = formatCrmPhoneInput(value);
      return { ...prev, phones };
    });
  };

  const addNewPhoneRow = () => {
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  };

  const removeNewPhoneRow = (index: number) => {
    onClearFieldError?.(`phones.${index}`);
    onClearFieldError?.('phones');
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.length <= 1 ? [''] : prev.phones.filter((_, i) => i !== index),
    }));
  };

  const updateObjectAddressAt = (index: number, value: string) => {
    onClearFieldError?.(`objectAddresses.${index}`);
    setForm((prev) => {
      const objectAddresses = [...prev.objectAddresses];
      objectAddresses[index] = value;
      return { ...prev, objectAddresses };
    });
  };

  const addObjectAddressRow = () => {
    setForm((prev) => ({ ...prev, objectAddresses: [...prev.objectAddresses, ''] }));
  };

  const removeObjectAddressRow = (index: number) => {
    onClearFieldError?.(`objectAddresses.${index}`);
    setForm((prev) => ({
      ...prev,
      objectAddresses: prev.objectAddresses.filter((_, i) => i !== index),
    }));
  };

  const isPerson = form.entityType === 'PERSON';
  const pid = (name: string) => `${idPrefix}-${name}`;
  const phonesGroupError = fieldErrors.phones;

  const emailField = (
    <FieldWrap id={pid('email')} label="E-mail" error={err('email')}>
      <input
        id={pid('email')}
        type="email"
        value={form.email}
        onChange={set('email')}
        autoComplete="email"
        {...inputProps('email')}
      />
    </FieldWrap>
  );

  const personNameFields = (
    <>
      <FieldWrap id={pid('last-name')} label="Фамилия" error={err('lastName')}>
        {isPersonNamePartLocked('lastName', locks) ? (
          <input id={pid('last-name')} value={form.lastName} readOnly disabled />
        ) : (
          <input
            id={pid('last-name')}
            value={form.lastName}
            onChange={set('lastName')}
            autoComplete="family-name"
            {...inputProps('lastName')}
          />
        )}
      </FieldWrap>
      <FieldWrap id={pid('first-name')} label="Имя" error={err('firstName')}>
        {isPersonNamePartLocked('firstName', locks) ? (
          <input id={pid('first-name')} value={form.firstName} readOnly disabled />
        ) : (
          <input
            id={pid('first-name')}
            value={form.firstName}
            onChange={set('firstName')}
            autoComplete="given-name"
            {...inputProps('firstName')}
          />
        )}
      </FieldWrap>
      <FieldWrap id={pid('patronymic')} label="Отчество" error={err('patronymic')}>
        {isPersonNamePartLocked('patronymic', locks) ? (
          <input id={pid('patronymic')} value={form.patronymic} readOnly disabled />
        ) : (
          <input
            id={pid('patronymic')}
            value={form.patronymic}
            onChange={set('patronymic')}
            autoComplete="additional-name"
            {...inputProps('patronymic')}
          />
        )}
      </FieldWrap>
    </>
  );

  const organizationNameField = (
    <FieldWrap
      id={pid('org')}
      label="Наименование организации"
      error={err('organizationName')}
      required={showRequiredMarks && !isPerson}
    >
      {locks.organizationName ? (
        <input id={pid('org')} value={form.organizationName} readOnly disabled />
      ) : (
        <input
          id={pid('org')}
          value={form.organizationName}
          onChange={set('organizationName')}
          {...inputProps('organizationName')}
        />
      )}
    </FieldWrap>
  );

  return (
    <>
      {showEntityType ? (
        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor={pid('entity-type')}>Тип</label>
            {locks.entityType ? (
              <input id={pid('entity-type')} value={form.entityType} readOnly disabled />
            ) : (
              <select
                id={pid('entity-type')}
                value={form.entityType}
                onChange={(e) => {
                  onClearFieldError?.('inn');
                  onClearFieldError?.('ogrn');
                  setForm((p) => ({ ...p, entityType: e.target.value as CrmCustomerEntityType }));
                }}
              >
                <option value="PERSON">Физлицо</option>
                <option value="COMPANY">Юридическое лицо</option>
                <option value="ENTREPRENEUR">ИП</option>
              </select>
            )}
          </div>
          {emailField}
        </div>
      ) : (
        <div
          data-modal-form-grid
          className={
            personNameEmailSingleRow && isPerson ? formStyles.personNameEmailRow : undefined
          }
        >
          {isPerson ? personNameFields : organizationNameField}
          {emailField}
        </div>
      )}

      {showEntityType && isPerson ? (
        <div data-modal-form-grid className={formStyles.personNameRow}>
          {personNameFields}
        </div>
      ) : null}

      {!isPerson ? (
        <div data-modal-form-grid>
          <FieldWrap
            id={pid('rep-nom')}
            label="ФИО представителя (именит.)"
            error={err('repNom')}
            required={showRequiredMarks}
          >
            <input
              id={pid('rep-nom')}
              value={form.repNom}
              onChange={set('repNom')}
              {...inputProps('repNom')}
            />
          </FieldWrap>
          <FieldWrap id={pid('rep-gen')} label="ФИО представителя (родит.)" error={err('repGen')}>
            <input
              id={pid('rep-gen')}
              value={form.repGen}
              onChange={set('repGen')}
              {...inputProps('repGen')}
            />
          </FieldWrap>
          {showEntityType ? organizationNameField : null}
          <FieldWrap
            id={pid('pos-nom')}
            label="Должность представ. (именит.)"
            error={err('posNom')}
          >
            <input id={pid('pos-nom')} value={form.posNom} onChange={set('posNom')} />
          </FieldWrap>
          <FieldWrap id={pid('pos-gen')} label="Должность представ. (родит.)" error={err('posGen')}>
            <input id={pid('pos-gen')} value={form.posGen} onChange={set('posGen')} />
          </FieldWrap>
          <FieldWrap id={pid('inn')} label="ИНН" error={err('inn')}>
            <input
              id={pid('inn')}
              value={form.inn}
              onChange={set('inn')}
              inputMode="numeric"
              {...inputProps('inn')}
            />
          </FieldWrap>
          <FieldWrap id={pid('ogrn')} label="ОГРН" error={err('ogrn')}>
            <input
              id={pid('ogrn')}
              value={form.ogrn}
              onChange={set('ogrn')}
              inputMode="numeric"
              {...inputProps('ogrn')}
            />
          </FieldWrap>
        </div>
      ) : null}

      <div data-modal-form-group>
        <label id={pid('phones-label')}>
          Телефоны
          {showRequiredMarks ? ' *' : null}
        </label>
        <p className={formStyles.phoneHint}>
          {lockedPhones.length > 0
            ? 'Сохранённые номера изменить нельзя. Добавьте новый номер при необходимости.'
            : 'Первый номер в списке — основной (договоры, поиск).'}{' '}
          {CRM_PHONE_FORMAT_HINT}
        </p>
        {phonesGroupError ? (
          <p id={`${pid('phones')}-error`} className={formStyles.fieldError} role="alert">
            {phonesGroupError}
          </p>
        ) : null}
        <div
          className={formStyles.phoneToolbarRow}
          role="group"
          aria-labelledby={pid('phones-label')}
        >
          {lockedPhones.map((tel, index) => (
            <div key={`locked-${tel}-${index}`} className={formStyles.phoneSlot}>
              <input
                type="tel"
                value={formatCrmPhoneDisplay(tel)}
                readOnly
                disabled
                aria-label={`Телефон ${index + 1}`}
              />
            </div>
          ))}
          {form.phones.map((tel, index) => {
            const phoneErr = fieldErrors[`phones.${index}`];
            return (
              <div key={`new-${index}`} className={formStyles.phoneSlot}>
                <div className={formStyles.phoneSlotInputs}>
                  <input
                    type="tel"
                    autoComplete="tel"
                    aria-label={`Новый телефон ${index + 1}`}
                    aria-invalid={phoneErr ? true : undefined}
                    aria-describedby={phoneErr ? `${pid('phone')}-${index}-error` : undefined}
                    className={invalidClass(Boolean(phoneErr))}
                    value={tel}
                    onChange={(e) => updateNewPhoneAt(index, e.target.value)}
                    placeholder={lockedPhones.length > 0 ? 'Новый номер' : CRM_PHONE_PLACEHOLDER}
                  />
                  {phoneErr ? (
                    <p
                      id={`${pid('phone')}-${index}-error`}
                      className={formStyles.fieldError}
                      role="alert"
                    >
                      {phoneErr}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={formStyles.phoneRemove}
                  disabled={form.phones.length <= 1 && lockedPhones.length === 0}
                  onClick={() => removeNewPhoneRow(index)}
                  aria-label={`Удалить новый телефон ${index + 1}`}
                >
                  Удалить
                </button>
              </div>
            );
          })}
          <button
            type="button"
            data-modal-btn="secondary"
            className={formStyles.addPhone}
            onClick={addNewPhoneRow}
          >
            Добавить номер
          </button>
        </div>
      </div>

      <FieldWrap id={pid('residence-address')} label="Адрес проживания" error={err('address')}>
        <input
          id={pid('residence-address')}
          value={form.address}
          onChange={set('address')}
          autoComplete="street-address"
          {...inputProps('address')}
        />
      </FieldWrap>

      <div data-modal-form-group>
        <label id={pid('object-addresses-label')}>Адреса объектов</label>
        <div
          className={formStyles.phoneToolbarRow}
          role="group"
          aria-labelledby={pid('object-addresses-label')}
        >
          {form.objectAddresses.map((addr, index) => {
            const addrErr = fieldErrors[`objectAddresses.${index}`];
            return (
              <div key={index} className={formStyles.phoneSlot}>
                <div className={formStyles.phoneSlotInputs}>
                  <input
                    type="text"
                    autoComplete="off"
                    aria-label={`Адрес объекта ${index + 1}`}
                    aria-invalid={addrErr ? true : undefined}
                    className={invalidClass(Boolean(addrErr))}
                    value={addr}
                    onChange={(e) => updateObjectAddressAt(index, e.target.value)}
                    placeholder="г. …, ул. …, д. …"
                  />
                  {addrErr ? (
                    <p className={formStyles.fieldError} role="alert">
                      {addrErr}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={formStyles.phoneRemove}
                  onClick={() => removeObjectAddressRow(index)}
                  aria-label={`Удалить адрес объекта ${index + 1}`}
                >
                  Удалить
                </button>
              </div>
            );
          })}
          <button
            type="button"
            data-modal-btn="secondary"
            className={formStyles.addPhone}
            onClick={addObjectAddressRow}
          >
            Добавить адрес объекта
          </button>
        </div>
      </div>

      <FieldWrap id={pid('bank')} label="Банковские реквизиты" error={err('bankDetails')}>
        <textarea
          id={pid('bank')}
          rows={2}
          value={form.bankDetails}
          onChange={set('bankDetails')}
        />
      </FieldWrap>

      {isPerson ? (
        <div
          data-modal-form-grid
          className={
            showEntityType || personNameEmailSingleRow ? formStyles.passportRow : undefined
          }
        >
          <FieldWrap
            id={pid('pass')}
            label="Паспорт (серия и номер)"
            error={err('passportSeriesNumber')}
          >
            <input
              id={pid('pass')}
              value={form.passportSeriesNumber}
              onChange={set('passportSeriesNumber')}
              placeholder="1234 567890"
              {...inputProps('passportSeriesNumber')}
            />
          </FieldWrap>
          <FieldWrap id={pid('pass-by')} label="Кем выдан" error={err('passportIssuedBy')}>
            <input
              id={pid('pass-by')}
              value={form.passportIssuedBy}
              onChange={set('passportIssuedBy')}
              {...inputProps('passportIssuedBy')}
            />
          </FieldWrap>
          <FieldWrap id={pid('pass-date')} label="Дата выдачи" error={err('passportIssueDate')}>
            <input
              id={pid('pass-date')}
              value={form.passportIssueDate}
              onChange={set('passportIssueDate')}
              placeholder="дд.мм.гггг"
              {...inputProps('passportIssueDate')}
            />
          </FieldWrap>
        </div>
      ) : null}

      <FieldWrap id={pid('notes')} label="Заметки" error={err('notes')}>
        <textarea id={pid('notes')} rows={2} value={form.notes} onChange={set('notes')} />
      </FieldWrap>
    </>
  );
}
