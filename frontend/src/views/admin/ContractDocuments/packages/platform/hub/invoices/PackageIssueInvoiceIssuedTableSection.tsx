'use client';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { formatPackageIssuedInvoiceAmountRub } from '../../payments/packageInvoiceNumber';
import { formatDateRu } from '../payments/packageContractPaymentsFormat';
import { packageIssuedInvoicePaymentTypeLabel } from './packageIssueInvoicePanelUtils';
import type { PackageIssueInvoicePanelModel } from './usePackageIssueInvoicePanel';

export type PackageIssueInvoiceIssuedTableSectionProps = Pick<
  PackageIssueInvoicePanelModel,
  'issuedRows' | 'onReprint' | 'onDownload' | 'downloadBusy' | 'handleReprintDownload' | 'onShare'
>;

export function PackageIssueInvoiceIssuedTableSection({
  issuedRows,
  onReprint,
  onDownload,
  downloadBusy,
  handleReprintDownload,
  onShare,
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

                {onReprint || onShare ? <th></th> : null}
              </tr>
            </thead>

            <tbody>
              {issuedRows.map((row) => (
                <tr key={row.id}>
                  <td>{row.invoiceNumber}</td>

                  <td>{formatDateRu(row.invoiceDate)}</td>

                  <td>{row.basis}</td>

                  <td>{packageIssuedInvoicePaymentTypeLabel(row)}</td>

                  <td className={cdBase.paymentsHubSummaryNumCol}>
                    {formatPackageIssuedInvoiceAmountRub(Number(row.amount))} ₽
                  </td>

                  {onReprint || onShare ? (
                    <td>
                      <div className={cdBase.invoiceIssuedRowActions}>
                        {onReprint ? (
                          <button
                            type="button"
                            className={cdBase.paymentsHubConductSecondaryBtn}
                            onClick={() => onReprint(row)}
                          >
                            Печать
                          </button>
                        ) : null}
                        {onDownload ? (
                          <button
                            type="button"
                            className={cdBase.paymentsHubConductSecondaryBtn}
                            disabled={downloadBusy}
                            onClick={() => handleReprintDownload(row)}
                          >
                            {downloadBusy ? 'PDF…' : 'PDF'}
                          </button>
                        ) : null}
                        {onShare ? (
                          <button
                            type="button"
                            className={cdBase.paymentsHubConductSecondaryBtn}
                            onClick={() => onShare(row)}
                            title="Отправить заказчику (Telegram, WhatsApp, MAX, почта)"
                          >
                            Отправить
                          </button>
                        ) : null}
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
