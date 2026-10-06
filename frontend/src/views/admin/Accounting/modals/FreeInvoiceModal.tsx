'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import type { FreeInvoiceCustomerSnapshot } from '@/shared/api/admin-payment-invoices';
import {
  createFreePaymentInvoice,
  peekNextPaymentInvoiceNumber,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';
import measurementBlankStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { PackageIssueInvoiceLineRow } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageIssueInvoiceLineRow';
import { recalcLineFromPriceQty } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/packageIssueInvoicePanelUtils';
import {
  PACKAGE_BASIS_LABEL_FINAL,
  PACKAGE_BASIS_LABEL_FULL,
  PACKAGE_BASIS_LABEL_PARTIAL,
  PACKAGE_BASIS_LABEL_PREPAYMENT,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packagePaymentBasisOptions';
import {
  type PaymentInvoiceLineItem,
  emptyPaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  normalizePaymentInvoiceLineItem,
  parsePaymentInvoiceLineAmount,
  paymentInvoiceLineItemsForApi,
  sumPaymentInvoiceLineItems,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packagePaymentInvoiceLineItems';
import { mergePackageFormFromCrmCustomerDetail } from '@/views/admin/ContractDocuments/packages/platform/questionnaires/applyCrmContractToForm';

import cdBase from '../../ContractDocuments/styles/base.module.css';
import cdDocPreview from '../../ContractDocuments/styles/documents-preview.module.css';
import cdWorkspace from '../../ContractDocuments/styles/estimates-workspace.module.css';
import pageStyles from '../AccountingInvoicesPage.module.css';

/** Основания свободного счёта — те же формулировки, что в модалке счетов договора. */
const FREE_INVOICE_BASIS_OPTIONS = [
  { key: 'contract_prepayment', label: PACKAGE_BASIS_LABEL_PREPAYMENT, paymentType: 'PREPAYMENT' },
  { key: 'contract_partial', label: PACKAGE_BASIS_LABEL_PARTIAL, paymentType: 'ADVANCE' },
  { key: 'contract_final', label: PACKAGE_BASIS_LABEL_FINAL, paymentType: 'FINAL' },
  { key: 'contract_full', label: PACKAGE_BASIS_LABEL_FULL, paymentType: 'FINAL' },
] as const;

type FreeInvoiceBasisKey = (typeof FREE_INVOICE_BASIS_OPTIONS)[number]['key'];

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onCreated: () => void;
};

/** Автозаполнение полей заказчика из карточки CRM — тем же маппингом, что в редакторе договора. */
function customerSnapshotFromCrmDetail(detail: CrmCustomerDetail): FreeInvoiceCustomerSnapshot {
  const next = mergePackageFormFromCrmCustomerDetail(detail, mergeFormDataFromStorage({}).form);
  const c = next.customer;
  return {
    type: c.type,
    fullName: c.fullName,
    organizationName: c.organizationName,
    inn: c.inn,
    address: c.address,
    phone: c.phone,
    email: c.email,
  };
}

/** Свободный счёт без договора в базе: вёрстка как у модалки «Счета на оплату по договору». */
export function FreeInvoiceModal({ isOpen, onClose, onError, onCreated }: Props) {
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [basisKey, setBasisKey] = useState<FreeInvoiceBasisKey | ''>('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [executorTitle, setExecutorTitle] = useState('');
  const [executors, setExecutors] = useState<ExecutorRequisiteProfile[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerFields, setCustomerFields] = useState<FreeInvoiceCustomerSnapshot>({});
  const [lineItems, setLineItems] = useState<PaymentInvoiceLineItem[]>(() => [
    emptyPaymentInvoiceLineItem('SERVICE'),
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setBasisKey('');
    setContractNumber('');
    setContractDate('');
    setCustomerId(null);
    setCustomerFields({});
    setLineItems([emptyPaymentInvoiceLineItem('SERVICE')]);
    void peekNextPaymentInvoiceNumber()
      .then(({ nextNumber }) => {
        if (!cancelled) setInvoiceNumber(nextNumber);
      })
      .catch(() => undefined);
    void getContractDocumentExecutorProfiles('REPAIR')
      .then((res) => {
        if (cancelled) return;
        const items = res.items ?? [];
        setExecutors(items);
        setExecutorTitle((prev) => prev || items[0]?.title || '');
      })
      .catch(() => {
        if (!cancelled) onError('Не удалось загрузить справочник исполнителей');
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen, onError]);

  const selectedBasis = FREE_INVOICE_BASIS_OPTIONS.find((o) => o.key === basisKey);

  const selectedExecutor = useMemo(
    () => executors.find((e) => e.title === executorTitle),
    [executors, executorTitle]
  );

  // Как в модалке счетов договора: при вводе кол-ва/цены пересчитываем сумму строки.
  const updateLine = useCallback((index: number, patch: Partial<PaymentInvoiceLineItem>) => {
    setLineItems((prev) =>
      prev.map((line, i) => {
        if (i !== index) return line;
        const next = { ...line, ...patch };
        if ('quantity' in patch || 'unitPrice' in patch) {
          return recalcLineFromPriceQty(next);
        }
        return next;
      })
    );
  }, []);

  const addLine = useCallback((kind: 'GOODS' | 'SERVICE') => {
    setLineItems((prev) => [...prev, emptyPaymentInvoiceLineItem(kind)]);
  }, []);

  const removeLine = useCallback((index: number) => {
    setLineItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }, []);

  const totalRub = useMemo(
    () =>
      sumPaymentInvoiceLineItems(
        lineItems
          .map(normalizePaymentInvoiceLineItem)
          .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount))
      ),
    [lineItems]
  );

  const formComplete =
    Boolean(customerId) &&
    Boolean(
      (customerFields.fullName ?? '').trim() || (customerFields.organizationName ?? '').trim()
    ) &&
    Boolean(selectedExecutor) &&
    Boolean(selectedBasis) &&
    invoiceNumber.trim().length > 0 &&
    lineItems.some(
      (line) => line.name.trim() && (parsePaymentInvoiceLineAmount(line.amount) ?? 0) > 0
    );

  const submit = async () => {
    const customerName =
      (customerFields.fullName ?? '').trim() || (customerFields.organizationName ?? '').trim();
    if (!customerName) {
      onError('Выберите заказчика в базе или заполните поле «Заказчик»');
      return;
    }
    if (!selectedExecutor) {
      onError('Выберите исполнителя');
      return;
    }
    if (!selectedBasis) {
      onError('Выберите основание платежа');
      return;
    }
    const normalized = lineItems
      .map(normalizePaymentInvoiceLineItem)
      .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));
    if (normalized.length === 0 || totalRub <= 0) {
      onError('Добавьте позиции с суммами в таблицу счёта');
      return;
    }
    setSaving(true);
    try {
      await createFreePaymentInvoice({
        invoiceDate,
        amount: totalRub,
        paymentType: selectedBasis.paymentType,
        basis: selectedBasis.label,
        lineItems: paymentInvoiceLineItemsForApi(normalized),
        ...(contractNumber.trim() ? { contractNumber: contractNumber.trim() } : {}),
        ...(contractDate ? { contractDate } : {}),
        ...(customerId ? { customerId } : {}),
        customerName,
        customerSnapshot: customerFields,
        executorProfile: selectedExecutor,
      });
      onCreated();
      onClose();
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Не удалось выставить счёт');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Счёт без договора в базе"
      size="lg"
      className={panelStyles.modalPanel}
      showCloseButton
      compactOnMobile
    >
      <div data-modal-form data-modal-density="compact" className={pageStyles.freeInvoiceShell}>
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Нумерация счетов единая для всей организации. Заполните реквизиты договора, исполнителя и
          заказчика, позиции — в таблице. После выставления счёт появится в списке бухгалтерии; его
          можно напечатать, скачать PDF, отправить заказчику и подписать ЭП.
        </p>

        {/* Реквизиты: № и дата договора, исполнитель + заказчик через «Поиск заказчика в базе». */}
        <div className={measurementBlankStyles.blankSheet} style={{ marginBottom: 16 }}>
          <div style={{ marginTop: 12 }}>
            <CrmCustomerSearchPanel
              customerId={customerId}
              onCustomerApplied={(detail) => {
                setCustomerId(detail.id);
                setCustomerFields(customerSnapshotFromCrmDetail(detail));
              }}
              onClear={() => {
                setCustomerId(null);
                setCustomerFields({});
              }}
              onError={onError}
            />
          </div>

          <div
            className={`${cdBase.paymentsFormHubRow} ${cdBase.paymentsFormHubRowCompact} ${cdBase.paymentsFormHubRowInvoice}`}
          >
            <div className={cdBase.paymentsHubConductField}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_contract_number"
              >
                № договора
              </label>
              <input
                id="free_invoice_contract_number"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={contractNumber}
                onChange={(e) => setContractNumber(e.target.value)}
                placeholder="например, 125-9"
                autoComplete="off"
              />
            </div>

            <div className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubDateField}`}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_contract_date"
              >
                Дата договора
              </label>
              <input
                id="free_invoice_contract_date"
                type="date"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={contractDate}
                onChange={(e) => setContractDate(e.target.value)}
              />
            </div>

            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubBasisField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_executor"
              >
                Исполнитель
              </label>
              <select
                id="free_invoice_executor"
                className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                value={executorTitle}
                onChange={(e) => setExecutorTitle(e.target.value)}
              >
                {executors.length === 0 ? <option value="">— нет в справочнике —</option> : null}
                {executors.map((profile) => (
                  <option key={profile.title} value={profile.title}>
                    {profile.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div
            className={`${cdBase.paymentsFormHubRow} ${cdBase.paymentsFormHubRowCompact} ${cdBase.paymentsFormHubRowInvoice}`}
            style={{ marginTop: 12 }}
          >
            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubInvoiceNumberField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_customer_name"
              >
                Заказчик
              </label>
              <input
                id="free_invoice_customer_name"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={customerFields.fullName ?? ''}
                onChange={(e) => setCustomerFields((p) => ({ ...p, fullName: e.target.value }))}
                placeholder="ФИО или наименование"
                autoComplete="off"
              />
            </div>
            <div className={cdBase.paymentsHubConductField}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_customer_phone"
              >
                Телефон
              </label>
              <input
                id="free_invoice_customer_phone"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={customerFields.phone ?? ''}
                onChange={(e) => setCustomerFields((p) => ({ ...p, phone: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className={cdBase.paymentsHubConductField}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_customer_email"
              >
                E-mail
              </label>
              <input
                id="free_invoice_customer_email"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={customerFields.email ?? ''}
                onChange={(e) => setCustomerFields((p) => ({ ...p, email: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div className={cdBase.paymentsHubConductField}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_customer_inn"
              >
                ИНН
              </label>
              <input
                id="free_invoice_customer_inn"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={customerFields.inn ?? ''}
                onChange={(e) => setCustomerFields((p) => ({ ...p, inn: e.target.value }))}
                autoComplete="off"
              />
            </div>
            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubBasisField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_customer_address"
              >
                Адрес
              </label>
              <input
                id="free_invoice_customer_address"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={customerFields.address ?? ''}
                onChange={(e) => setCustomerFields((p) => ({ ...p, address: e.target.value }))}
                autoComplete="off"
              />
            </div>
          </div>
        </div>

        {/* Форма счёта — как в модалке «Счета на оплату по договору». */}
        <div className={`${measurementBlankStyles.blankSheet} ${cdBase.paymentsHubConductBlank}`}>
          <div
            className={`${cdBase.paymentsFormHubRow} ${cdBase.paymentsFormHubRowCompact} ${cdBase.paymentsFormHubRowInvoice}`}
          >
            <div className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubDateField}`}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_date"
              >
                Дата счёта
              </label>
              <input
                id="free_invoice_date"
                type="date"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
              />
            </div>

            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubInvoiceNumberField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_number"
              >
                № счёта
              </label>
              <input
                id="free_invoice_number"
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                autoComplete="off"
              />
            </div>

            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubBasisField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_basis"
              >
                Основание
              </label>
              <select
                id="free_invoice_basis"
                className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
                value={basisKey}
                onChange={(e) => setBasisKey(e.target.value as FreeInvoiceBasisKey | '')}
              >
                <option value="">Выберите основание</option>
                {FREE_INVOICE_BASIS_OPTIONS.map((opt) => (
                  <option key={opt.key} value={opt.key}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubAmountField}`}
            >
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
                htmlFor="free_invoice_amount"
              >
                Итого, ₽
              </label>
              <input
                id="free_invoice_amount"
                readOnly
                className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
                value={totalRub > 0 ? formatPaymentInvoiceLineAmount(totalRub) : ''}
                placeholder="—"
              />
            </div>

            <div className={cdBase.paymentsFormHubSubmitField}>
              <label
                className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel} ${cdBase.paymentsFormHubSubmitSpacer}`}
                aria-hidden="true"
              >
                &nbsp;
              </label>

              <div className={cdBase.paymentsHubConductActions}>
                <button
                  data-admin-mutation
                  type="button"
                  className={cdBase.paymentsHubConductBtn}
                  disabled={saving || !formComplete}
                  onClick={() => void submit()}
                >
                  {saving ? 'Сохранение…' : 'Выставить счёт'}
                </button>
              </div>
            </div>
          </div>

          <section className={cdBase.invoiceLinesSection}>
            <h4 className={cdBase.invoiceLinesSectionTitle}>Товары и услуги</h4>

            <p className={cdDocPreview.hint} style={{ marginTop: 0, marginBottom: 8 }}>
              Позиции попадают в таблицу печатной формы счёта.
            </p>
            <div className={cdBase.paymentsTableWrap}>
              <table className={`${cdBase.paymentsTable} ${cdBase.invoiceLinesTable}`}>
                <thead>
                  <tr>
                    <th className={cdBase.invoiceLinesKindCol}>Вид</th>
                    <th className={cdBase.invoiceLinesNameCol}>Наименование</th>
                    <th style={{ width: 72 }}>Кол-во</th>
                    <th style={{ width: 72 }}>Ед.</th>
                    <th style={{ width: 88 }}>НДС</th>
                    <th style={{ width: 96 }}>Цена</th>
                    <th style={{ width: 96 }}>Сумма</th>
                    <th style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((line, index) => (
                    <PackageIssueInvoiceLineRow
                      key={`line-${index}`}
                      line={line}
                      index={index}
                      updateLine={updateLine}
                      removeLine={removeLine}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className={cdBase.invoiceLinesActions}>
              <button
                type="button"
                className={cdWorkspace.secondaryBtn}
                onClick={() => addLine('GOODS')}
              >
                + Товар
              </button>
              <button
                type="button"
                className={cdWorkspace.secondaryBtn}
                onClick={() => addLine('SERVICE')}
              >
                + Услуга
              </button>
            </div>
          </section>
        </div>
      </div>
    </Modal>
  );
}
