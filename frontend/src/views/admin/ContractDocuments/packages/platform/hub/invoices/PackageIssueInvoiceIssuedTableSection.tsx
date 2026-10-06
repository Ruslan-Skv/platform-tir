'use client';

import type { ContractDocumentPaymentInvoice } from '@/shared/api/admin-payment-invoices';
import { DownloadIcon, PrintIcon, ShareIcon, SignatureEpIcon } from '@/shared/ui/icons';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { formatPackageIssuedInvoiceAmountRub } from '../../payments/packageInvoiceNumber';
import { formatDateRu } from '../payments/packageContractPaymentsFormat';
import { packageIssuedInvoicePaymentTypeLabel } from './packageIssueInvoicePanelUtils';
import type { PackageIssueInvoicePanelModel } from './usePackageIssueInvoicePanel';

export type PackageIssueInvoiceIssuedTableSectionProps = Pick<
  PackageIssueInvoicePanelModel,
  | 'issuedRows'
  | 'onReprint'
  | 'onDownload'
  | 'downloadBusy'
  | 'handleReprintDownload'
  | 'onShare'
  | 'onToggleEp'
  | 'signEpBusy'
  | 'onDownloadRow'
>;

function epToggleTitle(row: ContractDocumentPaymentInvoice): string {
  if (!row.signedAt) {
    return 'Подписать счёт ЭП со стороны Подрядчика (без подписи заказчика)';
  }
  const who = [row.signedBy?.lastName, row.signedBy?.firstName].filter(Boolean).join(' ');
  return `Счёт подписан ЭП со стороны Подрядчика${who ? ` — ${who}` : ''}. Нажмите, чтобы отменить подпись`;
}

export function PackageIssueInvoiceIssuedTableSection({
  issuedRows,
  onReprint,
  onDownload,
  downloadBusy,
  handleReprintDownload,
  onShare,
  onToggleEp,
  signEpBusy,
  onDownloadRow,
}: PackageIssueInvoiceIssuedTableSectionProps) {
  return (
    <section data-modal-readonly-panel data-modal-density="compact">
      <h3 className={cdBase.sectionTitle} style={{ marginTop: 0 }}>
        Выставленные счета по договору
      </h3>

      {issuedRows.length === 0 ? (
        <p className={cdDocPreview.hint}>Пока нет выставленных счетов.</p>
      ) : (
        <div className={cdBase.paymentsTableWrap}>
          <table className={cdBase.paymentsTable}>
            <thead>
              <tr>
                <th>№</th>

                <th>Дата</th>

                <th>Основание</th>

                <th>Тип</th>

                <th className={cdBase.paymentsHubSummaryNumCol}>Сумма</th>

                {onReprint || onDownload || onToggleEp || onShare ? <th></th> : null}
              </tr>
            </thead>

            <tbody>
              {issuedRows.map((row) => {
                const pdfTitle = row.signedFileUrl
                  ? 'Скачать PDF счёта (со штампом ЭП)'
                  : 'Скачать PDF счёта';
                return (
                  <tr key={row.id}>
                    <td>{row.invoiceNumber}</td>

                    <td>{formatDateRu(row.invoiceDate)}</td>

                    <td>{row.basis}</td>

                    <td>{packageIssuedInvoicePaymentTypeLabel(row)}</td>

                    <td className={cdBase.paymentsHubSummaryNumCol}>
                      {formatPackageIssuedInvoiceAmountRub(Number(row.amount))} ₽
                    </td>

                    {onReprint || onDownload || onToggleEp || onShare ? (
                      <td>
                        <div className={cdBase.invoiceIssuedRowActions}>
                          {onReprint ? (
                            <button
                              type="button"
                              className={cdBase.invoiceIssuedIconBtn}
                              onClick={() => onReprint(row)}
                              title="Печать счёта"
                              aria-label="Печать счёта"
                            >
                              <PrintIcon />
                            </button>
                          ) : null}
                          {onDownload ? (
                            <button
                              type="button"
                              className={cdBase.invoiceIssuedIconBtn}
                              disabled={downloadBusy}
                              onClick={() =>
                                onDownloadRow ? onDownloadRow(row) : handleReprintDownload(row)
                              }
                              title={pdfTitle}
                              aria-label={pdfTitle}
                            >
                              <DownloadIcon />
                            </button>
                          ) : null}
                          {onToggleEp ? (
                            <button
                              type="button"
                              className={
                                row.signedAt
                                  ? `${cdBase.invoiceIssuedIconBtn} ${cdBase.invoiceIssuedIconBtnSigned}`
                                  : cdBase.invoiceIssuedIconBtn
                              }
                              disabled={signEpBusy}
                              title={epToggleTitle(row)}
                              aria-label={epToggleTitle(row)}
                              onClick={() => onToggleEp(row)}
                            >
                              <SignatureEpIcon />
                            </button>
                          ) : null}
                          {onShare ? (
                            <button
                              type="button"
                              className={cdBase.invoiceIssuedIconBtn}
                              onClick={() => onShare(row)}
                              title="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
                              aria-label="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
                            >
                              <ShareIcon tone="inherit" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
