'use client';

import {
  type ChangeEvent,
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { type CrmCustomerEntityType, createCrmCustomer } from '@/shared/api/admin-crm';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import { Modal } from '@/shared/ui/Modal';

import phoneStyles from './AddCrmCustomerModal.module.css';
import { normalizeObjectAddresses } from './crmCustomerExtendedProfile';

const MODAL_TITLE = 'Добавить клиента в базу';

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
  objectAddresses: string[];
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
  objectAddresses: [],
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
function computeAddCustomerFormFillPercent(form: FormState): number {
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

type CustomerDraft = {
  fullName?: string;
  phone?: string;
  residenceAddress?: string;
  objectAddress?: string;
  /** Устар.: с формы замера — трактуется как адрес объекта */
  address?: string;
};

function draftHasContent(draft: CustomerDraft | undefined): boolean {
  if (!draft) return false;
  return Boolean(
    draft.fullName?.trim() ||
    draft.phone?.trim() ||
    draft.residenceAddress?.trim() ||
    draft.objectAddress?.trim() ||
    draft.address?.trim()
  );
}

function getFillBannerToneClass(percent: number): string {
  if (percent >= 85) return phoneStyles.fillBannerSuccess;
  if (percent >= 55) return phoneStyles.fillBannerProgress;
  if (percent >= 30) return phoneStyles.fillBannerStarted;
  return phoneStyles.fillBannerLow;
}

function fillPercentHint(entityType: CrmCustomerEntityType): string {
  if (entityType === 'PERSON') {
    return 'В расчёт входят: e-mail, ФИО, телефоны, адрес проживания. Адреса объектов, паспорт и банковские реквизиты не учитываются.';
  }
  return 'В расчёт входят: e-mail, ФИО представителя, остальные данные представителя и организации, ИНН, ОГРН, адрес проживания, банковские реквизиты, телефоны. Адреса объектов не учитываются.';
}

function formFromDraft(draft: CustomerDraft): FormState {
  const objectAddr = draft.objectAddress?.trim() || draft.address?.trim() || '';
  return {
    ...emptyForm(),
    entityType: 'PERSON',
    fullName: draft.fullName?.trim() ?? '',
    phones: draft.phone?.trim() ? [draft.phone.trim()] : [''],
    address: draft.residenceAddress?.trim() ?? '',
    objectAddresses: objectAddr ? [objectAddr] : [],
  };
}

export function AddCrmCustomerModal({
  isOpen,
  onClose,
  onCreated,
  initialDraft,
}: {
  isOpen: boolean;
  onClose: () => void;
  /** Передаётся тело ответа API создания заказчика (для подстановки в формы и т.п.). */
  onCreated?: (created: unknown) => void;
  /** Подстановка полей только при открытии модалки (например с формы замера до привязки карточки). */
  initialDraft?: CustomerDraft;
}) {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const initialDraftRef = useRef(initialDraft);

  initialDraftRef.current = initialDraft;

  const reset = useCallback(() => {
    setForm(emptyForm());
    setError(null);
  }, []);

  const fillPercent = useMemo(() => computeAddCustomerFormFillPercent(form), [form]);

  const fillPercentHintText = useMemo(() => fillPercentHint(form.entityType), [form.entityType]);

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen) {
      if (wasOpen) reset();
      return;
    }

    if (!wasOpen) {
      const draft = initialDraftRef.current;
      setForm(draftHasContent(draft) ? formFromDraft(draft!) : emptyForm());
      setError(null);
    }
  }, [isOpen, reset]);

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

  const updateObjectAddressAt = useCallback((index: number, value: string) => {
    setForm((prev) => {
      const objectAddresses = [...prev.objectAddresses];
      objectAddresses[index] = value;
      return { ...prev, objectAddresses };
    });
  }, []);

  const addObjectAddressRow = useCallback(() => {
    setForm((prev) => ({ ...prev, objectAddresses: [...prev.objectAddresses, ''] }));
  }, []);

  const removeObjectAddressRow = useCallback((index: number) => {
    setForm((prev) => ({
      ...prev,
      objectAddresses: prev.objectAddresses.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

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
    const normalizedObjectAddresses = normalizeObjectAddresses(form.objectAddresses);

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
      address: form.address.trim(),
      objectAddresses: normalizedObjectAddresses,
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
      onCreated?.(created);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSubmitting(false);
    }
  };

  const isPerson = form.entityType === 'PERSON';

  const fillPercentTitleAside = (
    <div className={phoneStyles.fillBannerTooltipWrap}>
      <BadgeTooltip content={fillPercentHintText} side="left">
        <div
          className={`${phoneStyles.fillBanner} ${getFillBannerToneClass(fillPercent)}`}
          data-modal-footer-info
          role="status"
        >
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>Данные заказчика заполнены на {fillPercent}%.</span>
        </div>
      </BadgeTooltip>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={MODAL_TITLE}
      titleAside={fillPercentTitleAside}
      size="md"
      className={phoneStyles.modalPanel}
    >
      <form className={phoneStyles.formShell} data-modal-form onSubmit={handleSubmit}>
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

        {isPerson ? (
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
            Телефоны
          </label>
          <p className={phoneStyles.phoneHint}>
            Первый номер в списке — основной (договоры, поиск).
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

        <div data-modal-form-group>
          <label htmlFor="crm-residence-address">Адрес проживания</label>
          <input
            id="crm-residence-address"
            value={form.address}
            onChange={set('address')}
            autoComplete="street-address"
          />
        </div>

        <div data-modal-form-group>
          <label id="crm-object-addresses-label">Адреса объектов</label>
          {/* <p className={phoneStyles.objectAddressHint}>
            Укажите адреса, где планируются или выполнялись работы. Обычно новые объекты добавляют
            позже — после завершения работ по предыдущему адресу.
          </p> */}
          <div
            className={phoneStyles.phoneToolbarRow}
            role="group"
            aria-labelledby="crm-object-addresses-label"
          >
            {form.objectAddresses.map((addr, index) => (
              <div key={index} className={phoneStyles.phoneSlot}>
                <input
                  type="text"
                  autoComplete="off"
                  aria-label={`Адрес объекта ${index + 1}`}
                  value={addr}
                  onChange={(e) => updateObjectAddressAt(index, e.target.value)}
                  placeholder="г. …, ул. …, д. …"
                />
                <button
                  type="button"
                  data-modal-btn="secondary"
                  className={phoneStyles.phoneRemove}
                  onClick={() => removeObjectAddressRow(index)}
                  aria-label={`Удалить адрес объекта ${index + 1}`}
                >
                  Удалить
                </button>
              </div>
            ))}
            <button
              type="button"
              data-modal-btn="secondary"
              className={phoneStyles.addPhone}
              onClick={addObjectAddressRow}
            >
              Добавить адрес объекта
            </button>
          </div>
        </div>

        <div data-modal-form-group>
          <label htmlFor="crm-bank">Банковские реквизиты</label>
          <textarea id="crm-bank" rows={1} value={form.bankDetails} onChange={set('bankDetails')} />
        </div>

        {isPerson ? (
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
          <textarea id="crm-notes" rows={1} value={form.notes} onChange={set('notes')} />
        </div>

        {error ? <p data-modal-form-error>{error}</p> : null}

        <div data-modal-footer-info data-modal-tone="success" role="status">
          <span data-modal-footer-info-icon aria-hidden="true" />
          <span data-modal-footer-info-text>
            Карточка сохраняется в справочнике клиентов. В сводке «По договорам» заказчик появится
            после указания карточки на договоре.
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
