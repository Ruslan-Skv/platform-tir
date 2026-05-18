'use client';

import { ClockIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';

import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type CrmCustomerDetail,
  getCrmCustomer,
  trashCrmCustomer,
  updateCrmCustomer,
} from '@/shared/api/admin-crm';
import { BadgeTooltip } from '@/shared/ui/BadgeTooltip';
import confirmModalStyles from '@/shared/ui/ConfirmModal/ConfirmModal.module.css';
import { Modal } from '@/shared/ui/Modal';

import formStyles from './AddCrmCustomerModal.module.css';
import styles from './CrmCustomerDetailModal.module.css';
import { CrmCustomerFormFields } from './CrmCustomerFormFields';
import { CrmCustomerHistoryModal } from './CrmCustomerHistoryModal';
import {
  crmContractDetailHref,
  crmMeasurementDetailHref,
  extProfileString,
  formatCrmAuditActor,
  formatCrmDateTimeLocale,
  formatCrmEntityType,
  formatCrmMeasurementStatus,
  isCrmPersonEntity,
  resolveCrmCreatedByActor,
  resolveCrmEntityType,
} from './crmCustomerDisplay';
import { parseObjectAddresses } from './crmCustomerExtendedProfile';
import {
  computeCrmCustomerFormFillPercent,
  crmCustomerFillPercentHint,
  formStateForFillPercent,
  getCrmCustomerFillBannerToneClass,
} from './crmCustomerFillPercent';
import {
  type CrmCustomerFormState,
  buildCrmCustomerUpdatePayload,
  cloneCrmCustomerForm,
  formFromCrmCustomerDetail,
  isCrmCustomerEditFormDirty,
} from './crmCustomerForm';
import {
  type CrmCustomerFormFieldErrors,
  clearCrmCustomerFieldError,
  getFirstCrmCustomerFormError,
  hasCrmCustomerFormErrors,
  validateCrmCustomerForm,
} from './crmCustomerFormValidation';
import { joinPersonFullName, resolvePersonNamePartsFromDetail } from './crmCustomerName';
import { formatCrmPhoneOrDash } from './crmCustomerPhone';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateDdMmYyyy(iso: string | null | undefined): string {
  if (!iso?.trim()) return '—';
  const d = new Date(iso);
  if (!Number.isNaN(d.getTime())) {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
  }
  const [y, m, dayPart] = iso.split('-');
  const day = dayPart?.slice(0, 2);
  if (y && m && day) return `${day}.${m}.${y}`;
  return iso;
}

function disp(v: string | undefined | null): string {
  const s = v != null ? String(v).trim() : '';
  return s === '' ? '—' : s;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-modal-field>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function FieldSpan({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div data-modal-field data-modal-span>
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function CustomerAuditInfo({ data }: { data: CrmCustomerDetail }) {
  return (
    <div data-modal-footer-info data-modal-tone="success" role="status">
      <span data-modal-footer-info-icon aria-hidden="true" />
      <span data-modal-footer-info-text className={styles.auditInfoText}>
        <span className={styles.auditPart}>
          <strong>Создал:</strong> {formatCrmAuditActor(resolveCrmCreatedByActor(data))}
          {data.createdAt ? (
            <span className={styles.auditDate}> {formatCrmDateTimeLocale(data.createdAt)}</span>
          ) : null}
        </span>
        <span className={styles.auditSep} aria-hidden="true">
          ·
        </span>
        <span className={styles.auditPart}>
          <strong>Последнее изменение:</strong> {formatCrmAuditActor(data.updatedBy)}
          {data.updatedAt ? (
            <span className={styles.auditDate}> {formatCrmDateTimeLocale(data.updatedAt)}</span>
          ) : null}
        </span>
      </span>
    </div>
  );
}

function buildDisplayName(
  data: CrmCustomerDetail,
  ext: Record<string, unknown> | undefined
): string {
  const entityType = resolveCrmEntityType(data.entityType, ext);
  if (entityType === 'PERSON') {
    const joined = joinPersonFullName(resolvePersonNamePartsFromDetail(data));
    return joined || data.email || '—';
  }
  const org =
    data.company?.trim() ||
    (typeof ext?.organizationName === 'string' ? ext.organizationName.trim() : '');
  if (org) return org;
  return (
    [data.firstName, data.lastName].filter((x) => (x ?? '').trim()).join(' ') || data.email || '—'
  );
}

export function CrmCustomerDetailModal({
  customerId,
  isOpen,
  onClose,
  onUpdated,
  onTrashed,
}: {
  customerId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: () => void;
  onTrashed?: () => void;
}) {
  const [data, setData] = useState<CrmCustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<CrmCustomerFormState | null>(null);
  const [initialForm, setInitialForm] = useState<CrmCustomerFormState | null>(null);
  const [lockedPhones, setLockedPhones] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<CrmCustomerFormFieldErrors>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [trashing, setTrashing] = useState(false);

  const loadCustomer = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const row = await getCrmCustomer(id);
      setData(row);
      return row;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка загрузки');
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isOpen || !customerId) {
      setData(null);
      setError(null);
      setIsEditing(false);
      setForm(null);
      setInitialForm(null);
      setLockedPhones([]);
      setSaveError(null);
      setFieldErrors({});
      setShowHistory(false);
      setShowDeleteConfirm(false);
      return;
    }
    void loadCustomer(customerId);
  }, [isOpen, customerId, loadCustomer]);

  const handleConfirmTrash = async () => {
    if (!customerId) return;
    setTrashing(true);
    try {
      await trashCrmCustomer(customerId);
      setShowDeleteConfirm(false);
      onTrashed?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось переместить в корзину');
      setShowDeleteConfirm(false);
    } finally {
      setTrashing(false);
    }
  };

  const clearFieldError = useCallback((key: string) => {
    setFieldErrors((prev) => clearCrmCustomerFieldError(prev, key));
  }, []);

  const exitEditMode = useCallback(() => {
    setIsEditing(false);
    setForm(null);
    setInitialForm(null);
    setLockedPhones([]);
    setSaveError(null);
    setFieldErrors({});
  }, []);

  const startEdit = useCallback(() => {
    if (!data) return;
    const { form: nextForm, lockedPhones: locked } = formFromCrmCustomerDetail(data);
    const snapshot = cloneCrmCustomerForm(nextForm);
    setForm(snapshot);
    setInitialForm(cloneCrmCustomerForm(snapshot));
    setLockedPhones(locked);
    setSaveError(null);
    setFieldErrors({});
    setIsEditing(true);
  }, [data]);

  const initialPersonName = useMemo(
    () =>
      initialForm
        ? {
            lastName: initialForm.lastName,
            firstName: initialForm.firstName,
            patronymic: initialForm.patronymic,
          }
        : undefined,
    [initialForm]
  );

  const hasEditChanges = useMemo(() => {
    if (!form || !initialForm) return false;
    return isCrmCustomerEditFormDirty(form, initialForm, initialPersonName);
  }, [form, initialForm, initialPersonName]);

  const handleCancelEdit = useCallback(() => {
    exitEditMode();
  }, [exitEditMode]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!data || !form || !customerId || !hasEditChanges) return;
    setSaveError(null);

    const validation = validateCrmCustomerForm(form, {
      mode: 'edit',
      lockedPhones,
      initialPersonName,
    });
    setFieldErrors(validation);
    if (hasCrmCustomerFormErrors(validation)) {
      setSaveError(getFirstCrmCustomerFormError(validation));
      return;
    }

    setSaving(true);
    try {
      const payload = buildCrmCustomerUpdatePayload(
        form,
        lockedPhones,
        data,
        initialPersonName ?? {
          lastName: initialForm.lastName,
          firstName: initialForm.firstName,
          patronymic: initialForm.patronymic,
        }
      );
      await updateCrmCustomer(customerId, payload);
      await loadCustomer(customerId);
      exitEditMode();
      onUpdated?.();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const ext = data?.extendedProfile as Record<string, unknown> | undefined;
  const objectAddresses = parseObjectAddresses(ext);
  const entityType = data ? resolveCrmEntityType(data.entityType, ext) : null;
  const isPerson = data ? isCrmPersonEntity(data.entityType, ext) : false;
  const displayName = data ? buildDisplayName(data, ext) : '';
  const personName = data && isPerson ? resolvePersonNamePartsFromDetail(data) : null;
  const phones = data
    ? (data.phones?.length ? data.phones : data.phone ? [data.phone] : []).filter((p) => p?.trim())
    : [];

  const editLocks = useMemo(
    () => ({
      entityType: true,
      personFullName: false,
      organizationName: true,
      initialPersonName,
    }),
    [initialPersonName]
  );

  const fillSourceForm = useMemo(() => {
    if (isEditing && form) {
      return formStateForFillPercent(form, lockedPhones);
    }
    if (data) {
      const { form: viewForm, lockedPhones: locked } = formFromCrmCustomerDetail(data);
      return formStateForFillPercent(viewForm, locked);
    }
    return null;
  }, [data, form, isEditing, lockedPhones]);

  const fillPercent = useMemo(
    () => (fillSourceForm ? computeCrmCustomerFormFillPercent(fillSourceForm) : 0),
    [fillSourceForm]
  );

  const fillPercentHintText = useMemo(
    () => crmCustomerFillPercentHint(fillSourceForm?.entityType ?? 'PERSON'),
    [fillSourceForm?.entityType]
  );

  const fillPercentTitleAside =
    data && !loading && !error ? (
      <div className={formStyles.fillBannerTooltipWrap}>
        <BadgeTooltip content={fillPercentHintText} side="left">
          <div
            className={`${formStyles.fillBanner} ${getCrmCustomerFillBannerToneClass(fillPercent)}`}
            data-modal-footer-info
            role="status"
          >
            <span data-modal-footer-info-icon aria-hidden="true" />
            <span data-modal-footer-info-text>Данные заказчика заполнены на {fillPercent}%.</span>
          </div>
        </BadgeTooltip>
      </div>
    ) : null;

  const modalTitle =
    data && !loading && !error ? (
      isEditing ? (
        'Редактирование карточки клиента'
      ) : (
        <span className={styles.titleWithEdit}>
          Карточка клиента
          <button
            type="button"
            className={styles.editBtn}
            onClick={startEdit}
            title="Редактировать карточку"
            aria-label="Редактировать карточку"
          >
            <PencilSquareIcon className={styles.editIcon} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.historyBtn}
            onClick={() => setShowHistory(true)}
            title="История карточки клиента"
            aria-label="История карточки клиента"
          >
            <ClockIcon className={styles.editIcon} aria-hidden />
          </button>
          <button
            type="button"
            className={styles.trashBtn}
            onClick={() => setShowDeleteConfirm(true)}
            title="Удалить карточку (в корзину)"
            aria-label="Удалить карточку (в корзину)"
          >
            <TrashIcon className={styles.editIcon} aria-hidden />
          </button>
        </span>
      )
    ) : (
      'Карточка клиента'
    );

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={modalTitle}
        titleAside={fillPercentTitleAside}
        size="lg"
        className={formStyles.modalPanel}
        showCloseButton
      >
        {loading ? <p data-modal-form-hint>Загрузка…</p> : null}
        {error ? <p data-modal-form-error>{error}</p> : null}
        {data && !loading ? (
          <>
            {isEditing && form ? (
              <form
                id="crm-customer-edit-form"
                className={formStyles.formShell}
                data-modal-form
                data-modal-density="compact"
                onSubmit={handleSave}
              >
                <CustomerAuditInfo data={data} />
                <CrmCustomerFormFields
                  form={form}
                  setForm={(action) => {
                    setForm((prev) => {
                      if (!prev) return prev;
                      return typeof action === 'function' ? action(prev) : action;
                    });
                  }}
                  lockedPhones={lockedPhones}
                  locks={editLocks}
                  fieldErrors={fieldErrors}
                  onClearFieldError={clearFieldError}
                  idPrefix="crm-detail"
                  showEntityType={false}
                  personNameEmailSingleRow={isPerson}
                />
                {saveError ? <p data-modal-form-error>{saveError}</p> : null}
                <div data-modal-form-actions>
                  <button
                    type="button"
                    data-modal-btn="secondary"
                    onClick={handleCancelEdit}
                    disabled={saving}
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    data-modal-btn="primary"
                    disabled={saving || !hasEditChanges}
                  >
                    {saving ? 'Сохранение…' : 'Сохранить'}
                  </button>
                </div>

                <div
                  data-modal-readonly-panel
                  data-modal-density="compact"
                  className={styles.linkedSection}
                >
                  <h3 className={styles.linkedSectionTitle}>Связанные документы</h3>
                  <dl data-modal-detail>
                    <FieldSpan label="Договоры">
                      {(data.contracts ?? []).length === 0 ? (
                        '—'
                      ) : (
                        <ul className={styles.relatedLinksList}>
                          {(data.contracts ?? []).map((c) => {
                            const href = crmContractDetailHref(c);
                            const label = [
                              c.contractNumber ? `№ ${c.contractNumber}` : 'Без номера',
                              c.contractDate ? `от ${formatDateDdMmYyyy(c.contractDate)}` : null,
                              `— ${formatCurrency(c.totalAmount)}`,
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <li key={c.id}>
                                {href ? (
                                  <Link
                                    className={styles.relatedLink}
                                    href={href}
                                    onClick={onClose}
                                  >
                                    {label}
                                  </Link>
                                ) : (
                                  <span>{label}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </FieldSpan>
                    <FieldSpan label="Замеры">
                      {(data.measurements ?? []).length === 0 ? (
                        '—'
                      ) : (
                        <ul className={styles.relatedLinksList}>
                          {(data.measurements ?? []).map((m) => (
                            <li key={m.id}>
                              <Link
                                className={styles.relatedLink}
                                href={crmMeasurementDetailHref(m.id)}
                                onClick={onClose}
                              >
                                {formatDateDdMmYyyy(m.receptionDate)}
                                {m.customerName ? ` · ${m.customerName}` : ''}
                                {` · ${formatCrmMeasurementStatus(m.status)}`}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </FieldSpan>
                  </dl>
                </div>
              </form>
            ) : (
              <div className={formStyles.formShell} data-modal-form data-modal-density="compact">
                <CustomerAuditInfo data={data} />
                <div data-modal-readonly-panel data-modal-density="compact">
                  <dl data-modal-detail>
                    {isPerson && personName ? (
                      <>
                        <Field label="Фамилия">{disp(personName.lastName)}</Field>
                        <Field label="Имя">{disp(personName.firstName)}</Field>
                        <Field label="Отчество">{disp(personName.patronymic)}</Field>
                      </>
                    ) : (
                      <Field label="Наименование">{disp(displayName)}</Field>
                    )}
                    <Field label="Тип">{formatCrmEntityType(entityType)}</Field>
                    <Field label="E-mail">{disp(data.email)}</Field>
                    <Field label="Телефон">
                      {phones.length > 1 ? (
                        <ul className={styles.objectAddressList}>
                          {phones.map((tel) => (
                            <li key={tel}>{formatCrmPhoneOrDash(tel)}</li>
                          ))}
                        </ul>
                      ) : (
                        formatCrmPhoneOrDash(phones[0])
                      )}
                    </Field>
                    {!isPerson ? <Field label="Компания">{disp(data.company)}</Field> : null}
                    <Field label="Адрес проживания">{extProfileString(ext, 'address')}</Field>
                    <Field label="Адреса объектов">
                      {objectAddresses.length > 0 ? (
                        <ul className={styles.objectAddressList}>
                          {objectAddresses.map((addr) => (
                            <li key={addr}>{addr}</li>
                          ))}
                        </ul>
                      ) : (
                        '—'
                      )}
                    </Field>
                    <FieldSpan label="Банковские реквизиты">
                      {extProfileString(ext, 'bankDetails')}
                    </FieldSpan>
                    {isPerson ? (
                      <>
                        <Field label="Паспорт (серия и номер)">
                          {extProfileString(ext, 'passportSeriesNumber')}
                        </Field>
                        <Field label="Кем выдан">{extProfileString(ext, 'passportIssuedBy')}</Field>
                        <Field label="Дата выдачи">
                          {extProfileString(ext, 'passportIssueDate')}
                        </Field>
                      </>
                    ) : null}
                    <FieldSpan label="Заметки">{disp(data.notes)}</FieldSpan>
                    <FieldSpan label="Договоры">
                      {(data.contracts ?? []).length === 0 ? (
                        '—'
                      ) : (
                        <ul className={styles.relatedLinksList}>
                          {(data.contracts ?? []).map((c) => {
                            const href = crmContractDetailHref(c);
                            const label = [
                              c.contractNumber ? `№ ${c.contractNumber}` : 'Без номера',
                              c.contractDate ? `от ${formatDateDdMmYyyy(c.contractDate)}` : null,
                              `— ${formatCurrency(c.totalAmount)}`,
                            ]
                              .filter(Boolean)
                              .join(' ');
                            return (
                              <li key={c.id}>
                                {href ? (
                                  <Link
                                    className={styles.relatedLink}
                                    href={href}
                                    onClick={onClose}
                                  >
                                    {label}
                                  </Link>
                                ) : (
                                  <span>{label}</span>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </FieldSpan>
                    <FieldSpan label="Замеры">
                      {(data.measurements ?? []).length === 0 ? (
                        '—'
                      ) : (
                        <ul className={styles.relatedLinksList}>
                          {(data.measurements ?? []).map((m) => (
                            <li key={m.id}>
                              <Link
                                className={styles.relatedLink}
                                href={crmMeasurementDetailHref(m.id)}
                                onClick={onClose}
                              >
                                {formatDateDdMmYyyy(m.receptionDate)}
                                {m.customerName ? ` · ${m.customerName}` : ''}
                                {` · ${formatCrmMeasurementStatus(m.status)}`}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      )}
                    </FieldSpan>
                  </dl>
                </div>
              </div>
            )}
          </>
        ) : null}
      </Modal>
      {showHistory && data && customerId ? (
        <CrmCustomerHistoryModal
          customerId={customerId}
          customer={data}
          customerLabel={displayName !== '—' ? displayName : undefined}
          onClose={() => setShowHistory(false)}
        />
      ) : null}

      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          if (trashing) return;
          setShowDeleteConfirm(false);
        }}
        title="Удалить карточку клиента?"
        size="sm"
        showCloseButton
      >
        <div className={confirmModalStyles.content}>
          <p className={confirmModalStyles.message}>
            Карточка «<strong>{displayName !== '—' ? displayName : 'клиента'}</strong>» будет
            перемещена в корзину и исчезнет из общего списка заказчиков. Восстановить карточку можно
            в любой момент из корзины на странице заказчиков.
          </p>
          <div className={confirmModalStyles.actions}>
            <button
              type="button"
              className={confirmModalStyles.cancelButton}
              disabled={trashing}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Отмена
            </button>
            <button
              type="button"
              className={`${confirmModalStyles.confirmButton} ${confirmModalStyles.danger}`}
              disabled={trashing}
              onClick={() => void handleConfirmTrash()}
            >
              {trashing ? 'Подождите…' : 'В корзину'}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
