'use client';

import { type ChangeEvent, type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import { type CrmCustomerEntityType, createCrmCustomer } from '@/shared/api/admin-crm';
import { Modal } from '@/shared/ui/Modal';

import phoneStyles from './AddCrmCustomerModal.module.css';

type FormState = {
  entityType: CrmCustomerEntityType;
  email: string;
  phones: string[];
  fullName: string;
  repNom: string;
  repGen: string;
  organizationName: string;
  posNom: string;
  posGen: string;
  inn: string;
  ogrn: string;
  address: string;
  bankDetails: string;
  passportSeriesNumber: string;
  passportIssuedBy: string;
  passportIssueDate: string;
  notes: string;
};

const emptyForm = (): FormState => ({
  entityType: 'PERSON',
  email: '',
  phones: [''],
  fullName: '',
  repNom: '',
  repGen: '',
  organizationName: '',
  posNom: '',
  posGen: '',
  inn: '',
  ogrn: '',
  address: '',
  bankDetails: '',
  passportSeriesNumber: '',
  passportIssuedBy: '',
  passportIssueDate: '',
  notes: '',
});

function hasTrimmedText(value: string): boolean {
  return value.trim().length > 0;
}

function hasAnyTrimmedPhone(phones: readonly string[]): boolean {
  return phones.some((p) => p.trim().length > 0);
}

const FIO_TARGET_WORD_COUNT = 3;

function countWhitespaceSeparatedWords(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

/** Полное ФИО — три слова (фамилия, имя, отчество); при меньшем числе слов вклад пропорционально меньше. */
function fioSlotWeight(value: string): number {
  const n = countWhitespaceSeparatedWords(value);
  if (n === 0) return 0;
  return Math.min(n, FIO_TARGET_WORD_COUNT) / FIO_TARGET_WORD_COUNT;
}

/** Доля заполненных полей: у физлица без паспорта и банковских реквизитов; e-mail учитывается, но не обязателен. Заметки не учитываются. */
function computeAddCustomerFormFillPercent(form: FormState, isQuick: boolean): number {
  if (isQuick) {
    const parts =
      fioSlotWeight(form.fullName) +
      (hasAnyTrimmedPhone(form.phones) ? 1 : 0) +
      (hasTrimmedText(form.address) ? 1 : 0);
    return Math.round((parts / 3) * 100);
  }

  if (form.entityType === 'PERSON') {
    const parts =
      (hasTrimmedText(form.email) ? 1 : 0) +
      fioSlotWeight(form.fullName) +
      (hasAnyTrimmedPhone(form.phones) ? 1 : 0) +
      (hasTrimmedText(form.address) ? 1 : 0);
    return Math.round((parts / 4) * 100);
  }

  const parts =
    (hasTrimmedText(form.email) ? 1 : 0) +
    fioSlotWeight(form.repNom) +
    (hasTrimmedText(form.repGen) ? 1 : 0) +
    (hasTrimmedText(form.organizationName) ? 1 : 0) +
    (hasTrimmedText(form.posNom) ? 1 : 0) +
    (hasTrimmedText(form.posGen) ? 1 : 0) +
    (hasTrimmedText(form.inn) ? 1 : 0) +
    (hasTrimmedText(form.ogrn) ? 1 : 0) +
    (hasTrimmedText(form.address) ? 1 : 0) +
    (hasTrimmedText(form.bankDetails) ? 1 : 0) +
    (hasAnyTrimmedPhone(form.phones) ? 1 : 0);
  return Math.round((parts / 11) * 100);
}

export function AddCrmCustomerModal({
  isOpen,
  onClose,
  onCreated,
  formMode = 'full',
  initialMeasurementDraft,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Передаётся тело ответа API создания заказчика (для подстановки в формы и т.п.). */
  onCreated?: (created: unknown) => void;
  /** `measurementQuick` — только ФИО, телефоны и адрес; e-mail создаётся на сервере автоматически. */
  formMode?: 'full' | 'measurementQuick';
  /** Подстановка в краткую форму при открытии (например с полей замера). */
  initialMeasurementDraft?: { fullName: string; phone: string; address: string };
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setForm(emptyForm());
    setError(null);
  }, []);

  const isQuick = formMode === 'measurementQuick';

  const fillPercent = useMemo(
    () => computeAddCustomerFormFillPercent(form, isQuick),
    [form, isQuick]
  );

  const fillPercentAsideHint = useMemo(() => {
    if (isQuick) {
      return 'В расчёт входят: ФИО, телефоны, адрес. E-mail в этой форме не задаётся — на сервере создаётся служебный адрес. Заметки не учитываются.';
    }
    if (form.entityType === 'PERSON') {
      return 'В расчёт входят: e-mail, ФИО, телефоны, адрес. Паспорт и банковские реквизиты не учитываются.';
    }
    return 'В расчёт входят: e-mail, ФИО представителя, остальные данные представителя и организации, ИНН, ОГРН, адрес, банковские реквизиты, телефоны.';
  }, [isQuick, form.entityType]);

  useEffect(() => {
    if (!isOpen || !isQuick) return;
    setForm(() => ({
      ...emptyForm(),
      entityType: 'PERSON',
      fullName: initialMeasurementDraft?.fullName?.trim() ?? '',
      phones: initialMeasurementDraft?.phone?.trim()
        ? [initialMeasurementDraft.phone.trim()]
        : [''],
      address: initialMeasurementDraft?.address?.trim() ?? '',
    }));
    setError(null);
  }, [
    isOpen,
    isQuick,
    initialMeasurementDraft?.fullName,
    initialMeasurementDraft?.phone,
    initialMeasurementDraft?.address,
  ]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const set =
    <K extends keyof FormState>(key: K) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const v = e.target.value;
      setForm((prev) => ({ ...prev, [key]: v }) as FormState);
    };

  const updatePhoneAt = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const phones = [...prev.phones];
      phones[index] = value;
      return { ...prev, phones };
    });
  }, []);

  const addPhoneRow = useCallback(() => {
    setForm((prev) => ({ ...prev, phones: [...prev.phones, ''] }));
  }, []);

  const removePhoneRow = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      phones: prev.phones.length <= 1 ? [''] : prev.phones.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isQuick) {
      if (!form.fullName.trim()) {
        setError('Укажите ФИО');
        return;
      }
      const normalizedPhones = form.phones.map((p) => p.trim()).filter(Boolean);
      if (normalizedPhones.length === 0) {
        setError('Укажите телефон');
        return;
      }
      const ext: Record<string, unknown> = {
        type: 'PERSON',
        fullName: form.fullName.trim(),
        representativeFullNameNominative: '',
        representativeFullNameGenitive: '',
        organizationName: '',
        representativePositionNominative: '',
        representativePositionGenitive: '',
        inn: '',
        ogrn: '',
        address: form.address.trim(),
        phone: normalizedPhones[0] ?? '',
        email: '',
        bankDetails: '',
        passportSeriesNumber: '',
        passportIssuedBy: '',
        passportIssueDate: '',
      };
      setSubmitting(true);
      try {
        const created = await createCrmCustomer({
          firstName: form.fullName.trim(),
          phone: normalizedPhones[0],
          phones: normalizedPhones,
          entityType: 'PERSON',
          extendedProfile: ext,
          notes:
            form.notes.trim() ||
            'Карточка из замера: неполные данные — дозаполнить при оформлении договора.',
        });
        reset();
        onCreated?.(created);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const emailTrimmed = form.email.trim();
    if (form.entityType === 'PERSON' && !form.fullName.trim()) {
      setError('Укажите ФИО');
      return;
    }
    if (form.entityType !== 'PERSON') {
      if (!form.organizationName.trim()) {
        setError('Укажите наименование организации');
        return;
      }
      if (!form.repNom.trim()) {
        setError('Укажите ФИО представителя (именит.)');
        return;
      }
    }

    const normalizedPhones = form.phones.map((p) => p.trim()).filter(Boolean);

    const ext: Record<string, unknown> = {
      type: form.entityType,
      fullName: form.fullName,
      representativeFullNameNominative: form.repNom,
      representativeFullNameGenitive: form.repGen,
      organizationName: form.organizationName,
      representativePositionNominative: form.posNom,
      representativePositionGenitive: form.posGen,
      inn: form.inn,
      ogrn: form.ogrn,
      address: form.address,
      phone: normalizedPhones[0] ?? '',
      email: form.email,
      bankDetails: form.bankDetails,
      passportSeriesNumber: form.passportSeriesNumber,
      passportIssuedBy: form.passportIssuedBy,
      passportIssueDate: form.passportIssueDate,
    };

    const repTrim = form.repNom.trim();
    const repParts = repTrim.split(/\s+/).filter(Boolean);
    let firstNameForCrm: string;
    let lastName: string | undefined;
    if (form.entityType === 'PERSON') {
      firstNameForCrm = form.fullName.trim();
      lastName = undefined;
    } else if (repParts.length >= 2) {
      lastName = repParts[repParts.length - 1];
      firstNameForCrm = repParts.slice(0, -1).join(' ');
    } else {
      lastName = undefined;
      firstNameForCrm = repTrim;
    }

    setSubmitting(true);
    try {
      const created = await createCrmCustomer({
        ...(emailTrimmed ? { email: emailTrimmed } : {}),
        firstName: firstNameForCrm,
        lastName,
        phone: normalizedPhones[0] ?? undefined,
        phones: normalizedPhones.length > 0 ? normalizedPhones : undefined,
        company:
          form.entityType !== 'PERSON' ? form.organizationName.trim() || undefined : undefined,
        position: form.entityType !== 'PERSON' ? form.posNom.trim() || undefined : undefined,
        entityType: form.entityType,
        extendedProfile: ext,
        notes: form.notes.trim() || undefined,
      });
      reset();
      onCreated?.(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const isPerson = form.entityType === 'PERSON';

  const modalTitle =
    formMode === 'measurementQuick' ? 'Новый клиент (краткая карточка)' : 'Добавить клиента';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      titleAside={
        <div className={phoneStyles.titleAsideStack}>
          <span className={phoneStyles.titleAsideMain}>
            Данные заказчика заполнены на {fillPercent}%.
          </span>
          <span className={phoneStyles.titleAsideHint}>{fillPercentAsideHint}</span>
        </div>
      }
      size="lg"
    >
      <form data-modal-form data-modal-density="compact" onSubmit={handleSubmit}>
        {!isQuick ? (
          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="crm-entity-type">Тип</label>
              <select
                id="crm-entity-type"
                value={form.entityType}
                onChange={(e) =>
                  setForm((p) => ({ ...p, entityType: e.target.value as CrmCustomerEntityType }))
                }
              >
                <option value="PERSON">Физлицо</option>
                <option value="COMPANY">Юридическое лицо</option>
                <option value="ENTREPRENEUR">ИП</option>
              </select>
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-email">E-mail</label>
              <input id="crm-email" type="email" value={form.email} onChange={set('email')} />
            </div>
          </div>
        ) : (
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            E-mail будет создан автоматически; при договоре можно указать настоящий e-mail и
            остальные реквизиты в карточке клиента.
          </p>
        )}

        {isQuick || isPerson ? (
          <div data-modal-form-group>
            <label htmlFor="crm-fl-fio">ФИО *</label>
            <input id="crm-fl-fio" value={form.fullName} onChange={set('fullName')} />
          </div>
        ) : (
          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="crm-rep-nom">ФИО представителя (именит.) *</label>
              <input id="crm-rep-nom" value={form.repNom} onChange={set('repNom')} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-rep-gen">ФИО представителя (родит.)</label>
              <input id="crm-rep-gen" value={form.repGen} onChange={set('repGen')} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-org">Наименование организации *</label>
              <input
                id="crm-org"
                value={form.organizationName}
                onChange={set('organizationName')}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-pos-nom">Должность представ. (именит.)</label>
              <input id="crm-pos-nom" value={form.posNom} onChange={set('posNom')} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-pos-gen">Должность представ. (родит.)</label>
              <input id="crm-pos-gen" value={form.posGen} onChange={set('posGen')} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-inn">ИНН</label>
              <input id="crm-inn" value={form.inn} onChange={set('inn')} />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-ogrn">ОГРН</label>
              <input id="crm-ogrn" value={form.ogrn} onChange={set('ogrn')} />
            </div>
          </div>
        )}

        <div data-modal-form-group>
          <label id="crm-phones-label" htmlFor="crm-phone-0">
            Телефоны{isQuick ? ' *' : ''}
          </label>
          <p className={phoneStyles.phoneHint}>
            {isQuick
              ? 'Укажите хотя бы один номер — он будет основным в карточке клиента.'
              : 'Первый номер в списке — основной (договоры, поиск).'}
          </p>
          <div
            className={phoneStyles.phoneToolbarRow}
            role="group"
            aria-labelledby="crm-phones-label"
          >
            {form.phones.map((tel, index) => (
              <div key={index} className={phoneStyles.phoneSlot}>
                <input
                  id={index === 0 ? 'crm-phone-0' : undefined}
                  type="tel"
                  autoComplete="tel"
                  aria-label={`Телефон ${index + 1}`}
                  value={tel}
                  onChange={(e) => updatePhoneAt(index, e.target.value)}
                />
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={phoneStyles.phoneRemove}
                  disabled={form.phones.length <= 1}
                  onClick={() => removePhoneRow(index)}
                  aria-label={`Удалить телефон ${index + 1}`}
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              data-modal-btn="secondary"
              className={phoneStyles.addPhone}
              onClick={addPhoneRow}
            >
              Добавить номер
            </button>
          </div>
        </div>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="crm-address">Адрес</label>
            <input id="crm-address" value={form.address} onChange={set('address')} />
          </div>
        </div>

        {!isQuick ? (
          <div data-modal-form-group>
            <label htmlFor="crm-bank">Банковские реквизиты</label>
            <textarea
              id="crm-bank"
              rows={2}
              value={form.bankDetails}
              onChange={set('bankDetails')}
            />
          </div>
        ) : null}

        {isPerson && !isQuick ? (
          <div data-modal-form-grid>
            <div data-modal-form-group>
              <label htmlFor="crm-pass">Паспорт (серия и номер)</label>
              <input
                id="crm-pass"
                value={form.passportSeriesNumber}
                onChange={set('passportSeriesNumber')}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-pass-by">Кем выдан</label>
              <input
                id="crm-pass-by"
                value={form.passportIssuedBy}
                onChange={set('passportIssuedBy')}
              />
            </div>
            <div data-modal-form-group>
              <label htmlFor="crm-pass-date">Дата выдачи</label>
              <input
                id="crm-pass-date"
                value={form.passportIssueDate}
                onChange={set('passportIssueDate')}
              />
            </div>
          </div>
        ) : null}

        <div data-modal-form-group>
          <label htmlFor="crm-notes">Заметки</label>
          <textarea id="crm-notes" rows={2} value={form.notes} onChange={set('notes')} />
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-footer-info data-modal-tone="success" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            {isQuick
              ? 'Карточка сохраняется и связывается с замером. Полные реквизиты можно внести позже при договоре.'
              : 'Карточка сохраняется в справочнике клиентов. В сводке «По договорам» заказчик появится после указания карточки на договоре.'}
          </span>
        </div>

        <div data-modal-form-actions>
          <button
            type="button"
            data-modal-btn="secondary"
            onClick={handleClose}
            disabled={submitting}
          >
            Отмена
          </button>
          <button type="submit" data-modal-btn="primary" disabled={submitting}>
            {submitting ? 'Сохранение…' : 'Создать'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
