'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import Link from 'next/link';

import {
  type ContractDocumentPackage,
  type ContractDocumentPackageKind,
  getContractDocumentPackage,
  getContractDocumentPackagePayments,
  getContractDocumentPackages,
  getContractDocumentTemplatePresets,
} from '@/shared/api/admin-contract-document-packages';
import type { ContractTemplatePreset } from '@/shared/api/admin-contract-document-packages';
import {
  type ContractDocumentPaymentInvoice,
  createPackagePaymentInvoice,
  listAllPaymentInvoices,
  listPackagePaymentInvoices,
} from '@/shared/api/admin-payment-invoices';
import { Modal } from '@/shared/ui/Modal';
import crmFormStyles from '@/views/admin/CRM/Customers/AddCrmCustomerModal.module.css';
import { isProductDirectionPackageKind } from '@/views/admin/ContractDocuments/packages/config/productDirectionPackageKind';
import { mergeFormDataFromStorage } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import type { PackageDocumentTemplateTabId } from '@/views/admin/ContractDocuments/packages/platform/form/formDataTemplateStorage';
import { getPackageContractNumberDisplayForForm } from '@/views/admin/ContractDocuments/packages/platform/form/packageContractDisplay';
import { resolvePackageTemplateHtml } from '@/views/admin/ContractDocuments/packages/platform/form/resolvePackageTemplateHtml';
import { PackageInvoicesModal } from '@/views/admin/ContractDocuments/packages/platform/hub/PackageInvoicesModal';
import { PackageIssueInvoicePanel } from '@/views/admin/ContractDocuments/packages/platform/hub/PackageIssueInvoicePanel';
import {
  buildPackageInvoicePrintHtml,
  downloadPackagePaymentInvoice,
  paymentInvoiceLineItemsForApi,
  printPackagePaymentInvoice,
} from '@/views/admin/ContractDocuments/packages/platform/payments/packageInvoicePrint';
import { PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB } from '@/views/admin/ContractDocuments/packages/platform/tabs/packageActPrintTabs';

import cdBase from '../ContractDocuments/styles/base.module.css';
import cdHub from '../ContractDocuments/styles/contracts-list-hub.module.css';
import cdDataTab from '../ContractDocuments/styles/data-tab.module.css';
import cdDocPreview from '../ContractDocuments/styles/documents-preview.module.css';
import cdChrome from '../ContractDocuments/styles/editor-chrome.module.css';
import cdEstimateTab from '../ContractDocuments/styles/estimate-tab.module.css';
import cdEstimatesList from '../ContractDocuments/styles/estimates-list.module.css';
import cdWorkspace from '../ContractDocuments/styles/estimates-workspace.module.css';

function formatDateRu(isoDate: string) {
  const d = new Date(`${isoDate}T12:00:00`);
  if (!Number.isFinite(d.getTime())) return isoDate;
  return d.toLocaleDateString('ru-RU');
}

function formatMoneyRub(amount: string) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return amount;
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'RUB',
    maximumFractionDigits: 2,
  }).format(n);
}

export function AccountingInvoicesPage() {
  const [rows, setRows] = useState<ContractDocumentPaymentInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [issueOpen, setIssueOpen] = useState(false);
  const [packages, setPackages] = useState<ContractDocumentPackage[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [issuePackageForm, setIssuePackageForm] = useState(() => mergeFormDataFromStorage({}).form);
  const [issueTemplatePresets, setIssueTemplatePresets] = useState<ContractTemplatePreset[]>([]);
  const [issueTemplateOverrides, setIssueTemplateOverrides] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [issueSelectedTemplateIds, setIssueSelectedTemplateIds] = useState<
    Partial<Record<PackageDocumentTemplateTabId, string>>
  >({});
  const [issuePackageInvoices, setIssuePackageInvoices] = useState<
    ContractDocumentPaymentInvoice[]
  >([]);
  const [issuePaymentRows, setIssuePaymentRows] = useState<
    Awaited<ReturnType<typeof getContractDocumentPackagePayments>>
  >([]);
  const [issueSaving, setIssueSaving] = useState(false);
  const [contractEditorOpen, setContractEditorOpen] = useState(false);
  const [contractEditorPackageId, setContractEditorPackageId] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listAllPaymentInvoices({ search: search.trim() || undefined, limit: 1000 });
      setRows(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить счета');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

  const packageOptions = useMemo(() => {
    return packages
      .filter((p) => p.kind === 'REPAIR' && !p.deletedAt)
      .map((p) => {
        const { form } = mergeFormDataFromStorage(p.formData);
        const label = `${getPackageContractNumberDisplayForForm(form)}${form.customer.fullName ? ` — ${form.customer.fullName}` : ''}`;
        return { id: p.id, label };
      })
      .sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  }, [packages]);

  const openIssueModal = async () => {
    setIssueOpen(true);
    setPackagesLoading(true);
    try {
      const list = await getContractDocumentPackages('REPAIR');
      setPackages(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договоры');
    } finally {
      setPackagesLoading(false);
    }
  };

  const loadSelectedPackageForIssue = async (packageId: string) => {
    if (!packageId) return;
    try {
      const [row, presetsRes, invoices, payments] = await Promise.all([
        getContractDocumentPackage(packageId),
        getContractDocumentTemplatePresets('REPAIR'),
        listPackagePaymentInvoices(packageId),
        getContractDocumentPackagePayments(packageId).catch(() => []),
      ]);
      const merged = mergeFormDataFromStorage(row.formData);
      setIssuePackageForm(merged.form);
      setIssueTemplateOverrides(merged.templateOverrides);
      setIssueSelectedTemplateIds(merged.templatePresetIds);
      setIssueTemplatePresets(presetsRes.items ?? []);
      setIssuePackageInvoices(invoices);
      setIssuePaymentRows(payments);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось загрузить договор');
    }
  };

  const resolveIssueTemplateHtml = () =>
    resolvePackageTemplateHtml(
      PACKAGE_PAYMENT_INVOICE_TEMPLATE_TAB,
      issueTemplatePresets,
      issueSelectedTemplateIds,
      issueTemplateOverrides
    );

  useEffect(() => {
    if (!issueOpen || !selectedPackageId) return;
    void loadSelectedPackageForIssue(selectedPackageId);
  }, [issueOpen, selectedPackageId]);

  const openContractInvoices = (packageId: string) => {
    setContractEditorPackageId(packageId);
    setContractEditorOpen(true);
  };

  return (
    <div className={`${cdBase.page} ${cdBase.pageWide}`}>
      <div className={`${cdWorkspace.editorHeader} ${cdHub.blockHeader}`}>
        <div className={cdChrome.packageEditorHeaderLeft}>
          <h1 className={cdWorkspace.title}>Счета на оплату</h1>
          <p className={cdWorkspace.subtitle}>
            Единый журнал выставленных счетов по договорам ремонта. Номер счёта общий для всей
            организации.
          </p>
        </div>
        <div className={cdHub.headerActions}>
          <button
            type="button"
            className={cdWorkspace.primaryBtn}
            onClick={() => void openIssueModal()}
          >
            + Выставить счёт
          </button>
          <button
            type="button"
            className={`${cdBase.secondaryBtn} ${cdBase.estimatesPageRefreshIconBtn}`}
            disabled={loading}
            aria-busy={loading}
            title="Обновить список"
            onClick={() => void load()}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className={loading ? cdChrome.estimatesRefreshIconSpinning : undefined}
              aria-hidden
            >
              <path d="M23 4v6h-6" />
              <path d="M1 20v-6h6" />
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
            </svg>
          </button>
        </div>
      </div>

      <div className={cdWorkspace.estimatesToolbar} style={{ marginBottom: 16 }}>
        <input
          type="search"
          className={cdBase.searchInput}
          placeholder="Поиск: № счёта, договор, заказчик, основание…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="Поиск по счетам"
        />
      </div>

      {error ? <p className={cdBase.errorBanner}>{error}</p> : null}

      <div className={cdBase.paymentsTableWrap}>
        <table className={`${cdBase.paymentsTable} ${cdBase.repairContractsTable}`}>
          <thead>
            <tr>
              <th>№ счёта</th>
              <th>Дата</th>
              <th>Договор</th>
              <th>Заказчик</th>
              <th>Основание</th>
              <th className={cdBase.paymentsHubSummaryNumCol}>Сумма</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7}>
                  <p className={cdBase.hint}>Загрузка…</p>
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <p className={cdBase.hint}>Счетов пока нет.</p>
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoiceNumber}</td>
                  <td>{formatDateRu(row.invoiceDate)}</td>
                  <td>
                    <Link href={`/admin/contract-documents/contracts/${row.packageId}`}>
                      {row.contractNumber || '—'}
                    </Link>
                  </td>
                  <td>{row.customerName || '—'}</td>
                  <td>{row.basis}</td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>{formatMoneyRub(row.amount)}</td>
                  <td>
                    <button
                      type="button"
                      className={cdBase.paymentsHubConductSecondaryBtn}
                      onClick={() => openContractInvoices(row.packageId)}
                    >
                      Счета договора
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        isOpen={issueOpen}
        onClose={() => {
          setIssueOpen(false);
          setSelectedPackageId('');
        }}
        title="Выставить счёт по договору"
        size="lg"
        className={crmFormStyles.modalPanel}
        showCloseButton
      >
        <div data-modal-form data-modal-density="compact">
          <p data-modal-form-hint style={{ marginTop: 0 }}>
            Выберите договор, основание и позиции в таблице. Итог и номер счёта подставляются
            автоматически.
          </p>
          <div
            className={`${cdBase.field} ${cdDataTab.contractInlineField}`}
            style={{ marginBottom: 16 }}
          >
            <label htmlFor="accounting_issue_package">Договор</label>
            <select
              id="accounting_issue_package"
              value={selectedPackageId}
              disabled={packagesLoading}
              onChange={(e) => setSelectedPackageId(e.target.value)}
            >
              <option value="">— выберите договор —</option>
              {packageOptions.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          {selectedPackageId ? (
            <PackageIssueInvoicePanel
              packageId={selectedPackageId}
              form={issuePackageForm}
              issuedRows={issuePackageInvoices}
              paymentRows={issuePaymentRows}
              onError={setError}
              saving={issueSaving}
              onIssue={async (conduct, option) => {
                const amountNum = Number.parseFloat(conduct.amount.replace(',', '.'));
                if (!Number.isFinite(amountNum) || amountNum <= 0) {
                  setError('Укажите корректную сумму счёта');
                  return;
                }
                const lineItems = paymentInvoiceLineItemsForApi(conduct.lineItems);
                if (lineItems.length === 0) {
                  setError('Добавьте позиции в таблицу счёта');
                  return;
                }
                setIssueSaving(true);
                try {
                  await createPackagePaymentInvoice(selectedPackageId, {
                    invoiceDate: conduct.invoiceDate,
                    amount: amountNum,
                    paymentType: option.paymentType,
                    basis: conduct.paymentBasis,
                    lineItems,
                    ...(option.addendumNumber != null
                      ? { addendumNumber: option.addendumNumber }
                      : {}),
                  });
                  const html = await buildPackageInvoicePrintHtml(
                    issuePackageForm,
                    resolveIssueTemplateHtml(),
                    conduct
                  );
                  if (html.trim()) printPackagePaymentInvoice(html);
                  await load();
                  await loadSelectedPackageForIssue(selectedPackageId);
                  setIssueOpen(false);
                  setSelectedPackageId('');
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Не удалось выставить счёт');
                } finally {
                  setIssueSaving(false);
                }
              }}
              onPrint={(conduct) => {
                void (async () => {
                  const html = await buildPackageInvoicePrintHtml(
                    issuePackageForm,
                    resolveIssueTemplateHtml(),
                    conduct
                  );
                  if (!html.trim()) {
                    setError('Нет данных для печати счёта');
                    return;
                  }
                  printPackagePaymentInvoice(html);
                })();
              }}
              onDownload={(conduct) => {
                void (async () => {
                  try {
                    const html = await buildPackageInvoicePrintHtml(
                      issuePackageForm,
                      resolveIssueTemplateHtml(),
                      conduct
                    );
                    if (!html.trim()) {
                      setError('Нет данных для скачивания счёта');
                      return;
                    }
                    await downloadPackagePaymentInvoice(html, conduct);
                  } catch (e) {
                    setError(e instanceof Error ? e.message : 'Не удалось сформировать PDF');
                  }
                })();
              }}
              showIssuedTable={false}
            />
          ) : null}
        </div>
      </Modal>

      {contractEditorOpen && contractEditorPackageId ? (
        <PackageInvoicesModalLoader
          packageId={contractEditorPackageId}
          isOpen={contractEditorOpen}
          onClose={() => {
            setContractEditorOpen(false);
            setContractEditorPackageId('');
            void load();
          }}
          onError={setError}
          onInvoicesChanged={() => void load()}
        />
      ) : null}
    </div>
  );
}

/** Загружает данные пакета для модалки счетов из раздела бухгалтерии. */
function PackageInvoicesModalLoader({
  packageId,
  isOpen,
  onClose,
  onError,
  onInvoicesChanged,
}: {
  packageId: string;
  isOpen: boolean;
  onClose: () => void;
  onError: (message: string) => void;
  onInvoicesChanged?: () => void;
}) {
  const [ready, setReady] = useState(false);
  const [packageKind, setPackageKind] = useState<ContractDocumentPackageKind>('REPAIR');
  const [form, setForm] = useState(() => mergeFormDataFromStorage({}).form);
  const [templateOverrides, setTemplateOverrides] = useState({});
  const [selectedTemplateIds, setSelectedTemplateIds] = useState({});
  const [presets, setPresets] = useState<ContractTemplatePreset[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      try {
        const row = await getContractDocumentPackage(packageId);
        const presetsKind: ContractDocumentPackageKind = isProductDirectionPackageKind(row.kind)
          ? row.kind
          : 'REPAIR';
        const presetsRes = await getContractDocumentTemplatePresets(presetsKind);
        if (cancelled) return;
        const merged = mergeFormDataFromStorage(row.formData);
        setPackageKind(presetsKind);
        setForm(merged.form);
        setTemplateOverrides(merged.templateOverrides);
        setSelectedTemplateIds(merged.templatePresetIds);
        setPresets(presetsRes.items ?? []);
        setReady(true);
      } catch (e) {
        onError(e instanceof Error ? e.message : 'Не удалось загрузить договор');
      }
    })();
    return () => {
      cancelled = true;
      setReady(false);
    };
  }, [isOpen, packageId, onError]);

  if (!ready) return null;

  return (
    <PackageInvoicesModal
      packageId={packageId}
      packageKind={packageKind}
      form={form}
      isOpen={isOpen}
      onClose={onClose}
      onError={onError}
      onInvoicesChanged={onInvoicesChanged}
      contractTemplatePresets={presets}
      templateOverrides={templateOverrides}
      selectedTemplateIds={selectedTemplateIds}
    />
  );
}
