'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  type ExecutorRequisiteProfile,
  getContractDocumentExecutorProfiles,
} from '@/shared/api/admin-contract-document-packages';
import type { CrmCustomerDetail } from '@/shared/api/admin-crm';
import {
  type ContractDocumentPaymentInvoiceKind,
  createFreePaymentInvoice,
  peekNextPaymentInvoiceNumber,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import panelStyles from '@/views/admin/CRM/Customers/modals/AddCrmCustomerModal.module.css';
import { CrmCustomerSearchPanel } from '@/views/admin/CRM/Customers/modals/CrmCustomerSearchPanel';
import { PackageIssueInvoiceLineRow } from '@/views/admin/ContractDocuments/packages/platform/hub/invoices/PackageIssueInvoiceLineRow';
import {
  type PaymentInvoiceLineItem,
  emptyPaymentInvoiceLineItem,
  formatPaymentInvoiceLineAmount,
  normalizePaymentInvoiceLineItem,
  parsePaymentInvoiceLineAmount,
  paymentInvoiceLineItemsForApi,
  sumPaymentInvoiceLineItems,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packagePaymentInvoiceLineItems';

import cdBase from '../../ContractDocuments/styles/base.module.css';
import cdDocPreview from '../../ContractDocuments/styles/documents-preview.module.css';

const FREE_INVOICE_TYPE_LABELS: Record<
  Exclude<ContractDocumentPaymentInvoiceKind, 'AMENDMENT'>,
  string
> = {
  PREPAYMENT: 'Предоплата',
  ADVANCE: 'Частичная оплата',
  FINAL: 'Окончательный расчёт',
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onCreated: () => void;
};

function customerDisplayName(detail: CrmCustomerDetail): string {
  const fio = [detail.lastName, detail.firstName].filter(Boolean).join(' ').trim();
  return fio || detail.company?.trim() || detail.firstName || '';
}

/** Свободный счёт без договора в базе: все реквизиты вводятся в форме. */
export function FreeInvoiceModal({ isOpen, onClose, onError, onCreated }: Props) {
  const [invoiceDate, setInvoiceDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [paymentType, setPaymentType] =
    useState<Exclude<ContractDocumentPaymentInvoiceKind, 'AMENDMENT'>>('PREPAYMENT');
  const [basis, setBasis] = useState('');
  const [contractNumber, setContractNumber] = useState('');
  const [contractDate, setContractDate] = useState('');
  const [executorTitle, setExecutorTitle] = useState('');
  const [executors, setExecutors] = useState<ExecutorRequisiteProfile[]>([]);
  const [customer, setCustomer] = useState<{ id: string; fullName: string } | null>(null);
  const [lineItems, setLineItems] = useState<PaymentInvoiceLineItem[]>(() => [
    emptyPaymentInvoiceLineItem('SERVICE'),
  ]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setInvoiceDate(new Date().toISOString().slice(0, 10));
    setPaymentType('PREPAYMENT');
    setBasis('');
    setContractNumber('');
    setContractDate('');
    setCustomer(null);
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

  const selectedExecutor = useMemo(
    () => executors.find((e) => e.title === executorTitle),
    [executors, executorTitle]
  );

  const updateLine = useCallback((index: number, patch: Partial<PaymentInvoiceLineItem>) => {
    setLineItems((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)));
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
    Boolean(customer) &&
    Boolean(selectedExecutor) &&
    basis.trim().length > 0 &&
    lineItems.some(
      (line) => line.name.trim() && (parsePaymentInvoiceLineAmount(line.amount) ?? 0) > 0
    );

  const submit = async () => {
    if (!customer || !selectedExecutor) {
      onError('Выберите исполнителя и заказчика');
      return;
    }
    const normalized = lineItems
      .map(normalizePaymentInvoiceLineItem)
      .filter((line) => line.name && parsePaymentInvoiceLineAmount(line.amount));
    if (normalized.length === 0 || totalRub <= 0) {
      onError('Добавьте позиции с суммами в таблицу счёта');
      return;
    }
    if (!basis.trim()) {
      onError('Укажите основание счёта');
      return;
    }
    setSaving(true);
    try {
      await createFreePaymentInvoice({
        invoiceDate,
        amount: totalRub,
        paymentType,
        basis: basis.trim(),
        lineItems: paymentInvoiceLineItemsForApi(normalized),
        ...(contractNumber.trim() ? { contractNumber: contractNumber.trim() } : {}),
        ...(contractDate ? { contractDate } : {}),
        customerId: customer.id,
        customerName: customer.fullName,
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
      <div data-modal-form data-modal-density="compact">
        <p data-modal-form-hint style={{ marginTop: 0 }}>
          Счёт получает номер в общей нумерации и не привязан к договору. Реквизиты договора,
          исполнитель и заказчик заполняются вручную.
        </p>

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="free_invoice_contract_number">№ договора</label>
            <input
              id="free_invoice_contract_number"
              value={contractNumber}
              onChange={(e) => setContractNumber(e.target.value)}
              placeholder="например, 125-9"
              autoComplete="off"
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="free_invoice_contract_date">Дата договора</label>
            <input
              id="free_invoice_contract_date"
              type="date"
              value={contractDate}
              onChange={(e) => setContractDate(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="free_invoice_executor">Исполнитель</label>
            <select
              id="free_invoice_executor"
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
          <div data-modal-form-group>
            <label htmlFor="free_invoice_type">Тип платежа</label>
            <select
              id="free_invoice_type"
              value={paymentType}
              onChange={(e) =>
                setPaymentType(
                  e.target.value as Exclude<ContractDocumentPaymentInvoiceKind, 'AMENDMENT'>
                )
              }
            >
              {(
                Object.keys(FREE_INVOICE_TYPE_LABELS) as Array<
                  keyof typeof FREE_INVOICE_TYPE_LABELS
                >
              ).map((kind) => (
                <option key={kind} value={kind}>
                  {FREE_INVOICE_TYPE_LABELS[kind]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <CrmCustomerSearchPanel
          customerId={customer?.id ?? null}
          onCustomerApplied={(detail) => {
            const fullName = customerDisplayName(detail);
            setCustomer(fullName ? { id: detail.id, fullName } : null);
          }}
          onClear={() => setCustomer(null)}
          onError={onError}
        />

        <div data-modal-form-grid>
          <div data-modal-form-group>
            <label htmlFor="free_invoice_date">Дата счёта</label>
            <input
              id="free_invoice_date"
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
            />
          </div>
          <div data-modal-form-group>
            <label htmlFor="free_invoice_number">№ счёта</label>
            <input
              id="free_invoice_number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div data-modal-form-group data-modal-span>
            <label htmlFor="free_invoice_basis">Основание</label>
            <input
              id="free_invoice_basis"
              value={basis}
              onChange={(e) => setBasis(e.target.value)}
              placeholder="например, оплата по счёту"
              autoComplete="off"
            />
          </div>
        </div>

        <section className={cdBase.invoiceLinesSection}>
          <h4 className={cdBase.invoiceLinesSectionTitle}>Товары и услуги</h4>
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
              className={cdBase.paymentsHubConductSecondaryBtn}
              onClick={() => addLine('GOODS')}
            >
              + Товар
            </button>
            <button
              type="button"
              className={cdBase.paymentsHubConductSecondaryBtn}
              onClick={() => addLine('SERVICE')}
            >
              + Услуга
            </button>
          </div>
        </section>

        <p data-modal-form-hint>
          Итого по позициям:{' '}
          <strong>{totalRub > 0 ? `${formatPaymentInvoiceLineAmount(totalRub)} ₽` : '—'}</strong>
        </p>
        {customer ? (
          <p className={cdDocPreview.hint} style={{ marginTop: 0 }}>
            Заказчик: {customer.fullName}
          </p>
        ) : (
          <p className={cdDocPreview.hint} style={{ marginTop: 0 }}>
            Заказчик не выбран — найдите карточку в базе или добавьте новую через «Поиск заказчика в
            базе».
          </p>
        )}

        <div data-modal-form-actions>
          <button type="button" data-modal-btn="secondary" onClick={onClose}>
            Отмена
          </button>
          <button
            data-admin-mutation
            type="button"
            data-modal-btn="primary"
            disabled={saving || !formComplete}
            onClick={() => void submit()}
          >
            {saving ? 'Сохранение…' : 'Выставить счёт'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
