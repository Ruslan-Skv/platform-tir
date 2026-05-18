'use client';

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { createCrmCustomer } from '@/shared/api/admin-crm';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import { Modal } from '@/shared/ui/Modal';

import phoneStyles from './AddCrmCustomerModal.module.css';
import { CrmCustomerFormFields } from './CrmCustomerFormFields';
import { normalizeObjectAddresses } from './crmCustomerExtendedProfile';
import {
  computeCrmCustomerFormFillPercent,
  crmCustomerFillPercentHint,
  getCrmCustomerFillBannerToneClass,
} from './crmCustomerFillPercent';
import {
  type CrmCustomerFormState,
  emptyCrmCustomerForm,
  personNameFromForm,
} from './crmCustomerForm';
import {
  type CrmCustomerFormFieldErrors,
  clearCrmCustomerFieldError,
  getFirstCrmCustomerFormError,
  hasCrmCustomerFormErrors,
  validateCrmCustomerForm,
} from './crmCustomerFormValidation';
import { buildPersonExtendedProfileFields, parseFullNameString } from './crmCustomerName';
import { formatCrmPhoneDisplay, normalizeCrmPhonesList } from './crmCustomerPhone';

const MODAL_TITLE = 'Добавить клиента в базу';

type CustomerDraft = {
  /** Устар.: одна строка ФИО — разбирается на фамилию, имя, отчество */
  fullName?: string;
  lastName?: string;
  firstName?: string;
  patronymic?: string;
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
    draft.lastName?.trim() ||
    draft.firstName?.trim() ||
    draft.patronymic?.trim() ||
    draft.phone?.trim() ||
    draft.residenceAddress?.trim() ||
    draft.objectAddress?.trim() ||
    draft.address?.trim()
  );
}

function formFromDraft(draft: CustomerDraft): CrmCustomerFormState {
  const objectAddr = draft.objectAddress?.trim() || draft.address?.trim() || '';
  const legacyFull = draft.fullName?.trim() ?? '';
  const parsed = legacyFull ? parseFullNameString(legacyFull) : null;
  return {
    ...emptyCrmCustomerForm(),
    entityType: 'PERSON',
    lastName: draft.lastName?.trim() || parsed?.lastName || '',
    firstName: draft.firstName?.trim() || parsed?.firstName || '',
    patronymic: draft.patronymic?.trim() || parsed?.patronymic || '',
    phones: draft.phone?.trim()
      ? [formatCrmPhoneDisplay(draft.phone.trim()) || draft.phone.trim()]
      : [''],
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
  const [form, setForm] = useState<CrmCustomerFormState>(emptyCrmCustomerForm);
  const [fieldErrors, setFieldErrors] = useState<CrmCustomerFormFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wasOpenRef = useRef(false);
  const initialDraftRef = useRef(initialDraft);

  initialDraftRef.current = initialDraft;

  const reset = useCallback(() => {
    setForm(emptyCrmCustomerForm());
    setFieldErrors({});
    setError(null);
  }, []);

  const fillPercent = useMemo(() => computeCrmCustomerFormFillPercent(form), [form]);

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => clearCrmCustomerFieldError(prev, key));
  }, []);

  const fillPercentHintText = useMemo(
    () => crmCustomerFillPercentHint(form.entityType),
    [form.entityType]
  );

  useEffect(() => {
    const wasOpen = wasOpenRef.current;
    wasOpenRef.current = isOpen;

    if (!isOpen) {
      if (wasOpen) reset();
      return;
    }

    if (!wasOpen) {
      const draft = initialDraftRef.current;
      setForm(draftHasContent(draft) ? formFromDraft(draft!) : emptyCrmCustomerForm());
      setFieldErrors({});
      setError(null);
    }
  }, [isOpen, reset]);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const validation = validateCrmCustomerForm(form, { mode: 'create', lockedPhones: [] });
    setFieldErrors(validation);
    if (hasCrmCustomerFormErrors(validation)) {
      setError(getFirstCrmCustomerFormError(validation));
      return;
    }

    const emailTrimmed = form.email.trim();
    const normalizedPhones = normalizeCrmPhonesList(form.phones);
    const normalizedObjectAddresses = normalizeObjectAddresses(form.objectAddresses);

    const personName = personNameFromForm(form);
    const personExt =
      form.entityType === 'PERSON' ? buildPersonExtendedProfileFields(personName) : {};

    const ext: Record<string, unknown> = {
      type: form.entityType,
      ...personExt,
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
      const ln = personName.lastName.trim();
      const fn = personName.firstName.trim();
      if (fn) {
        firstNameForCrm = fn;
        lastName = ln || undefined;
      } else {
        firstNameForCrm = ln;
        lastName = undefined;
      }
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

  const fillPercentTitleAside = (
    <div className={phoneStyles.fillBannerTooltipWrap}>
      <BadgeTooltip content={fillPercentHintText} side="left">
        <div
          className={`${phoneStyles.fillBanner} ${getCrmCustomerFillBannerToneClass(fillPercent)}`}
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
        <CrmCustomerFormFields
          form={form}
          setForm={setForm}
          lockedPhones={[]}
          locks={{ entityType: false, personFullName: false, organizationName: false }}
          fieldErrors={fieldErrors}
          onClearFieldError={clearFieldError}
          idPrefix="crm"
          showEntityType
          showRequiredMarks
        />

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
