'use client';

import { Fragment } from 'react';

import measurementBlankStyles from '@/views/admin/CRM/Measurements/form/MeasurementFormPage.module.css';

import cdBase from '../../../../styles/base.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import { formatPackageInvoiceEstimateSourceLabel } from '../../payments/packageInvoiceLinesFromEstimate';
import { type PackageInvoiceEstimateSourceId } from '../../payments/packageInvoiceLinesFromEstimate';
import { type PackagePaymentBasisOptionKey } from '../../payments/packagePaymentBasisOptions';
import { PackageIssueInvoiceLineRow } from './PackageIssueInvoiceLineRow';
import type { PackageIssueInvoicePanelModel } from './usePackageIssueInvoicePanel';

export type PackageIssueInvoiceIssueFormSectionProps = Pick<
  PackageIssueInvoicePanelModel,
  | 'packageId'
  | 'saving'
  | 'showIssuedTable'
  | 'onDownload'
  | 'invoiceDate'
  | 'setInvoiceDate'
  | 'invoiceNumber'
  | 'setInvoiceNumber'
  | 'basisKey'
  | 'setBasisKey'
  | 'basisOptions'
  | 'amountDisplay'
  | 'formComplete'
  | 'isProductDirectionPackage'
  | 'contractSourceSummaryHint'
  | 'estimateLoadSource'
  | 'setEstimateLoadSource'
  | 'estimateSourceOptions'
  | 'selectedEstimateSource'
  | 'lineItems'
  | 'lineDisplay'
  | 'updateLine'
  | 'addLine'
  | 'resetAllLines'
  | 'removeLine'
  | 'loadLinesFromEstimate'
  | 'issuedNotice'
  | 'downloadBusy'
  | 'handleIssue'
  | 'handlePrint'
  | 'handleDownloadDraft'
>;

export function PackageIssueInvoiceIssueFormSection({
  packageId,
  saving,
  showIssuedTable,
  onDownload,
  invoiceDate,
  setInvoiceDate,
  invoiceNumber,
  setInvoiceNumber,
  basisKey,
  setBasisKey,
  basisOptions,
  amountDisplay,
  formComplete,
  isProductDirectionPackage,
  contractSourceSummaryHint,
  estimateLoadSource,
  setEstimateLoadSource,
  estimateSourceOptions,
  selectedEstimateSource,
  lineItems,
  lineDisplay,
  updateLine,
  addLine,
  resetAllLines,
  removeLine,
  loadLinesFromEstimate,
  issuedNotice,
  downloadBusy,
  handleIssue,
  handlePrint,
  handleDownloadDraft,
}: PackageIssueInvoiceIssueFormSectionProps) {
  return (
    <div
      className={`${measurementBlankStyles.blankSheet} ${cdBase.paymentsHubConductBlank}`}
      style={{ marginBottom: showIssuedTable ? 16 : 0 }}
    >
      <div
        className={`${cdBase.paymentsFormHubRow} ${cdBase.paymentsFormHubRowCompact} ${cdBase.paymentsFormHubRowInvoice}`}
      >
        <div className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubDateField}`}>
          <label
            className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
            htmlFor={`repair_invoice_date_${packageId}`}
          >
            Дата счёта
          </label>

          <input
            id={`repair_invoice_date_${packageId}`}
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
            htmlFor={`repair_invoice_number_${packageId}`}
          >
            № счёта
          </label>

          <input
            id={`repair_invoice_number_${packageId}`}
            className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
            value={invoiceNumber}
            onChange={(e) => setInvoiceNumber(e.target.value)}
            autoComplete="off"
          />
        </div>

        <div className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubBasisField}`}>
          <label
            className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
            htmlFor={`repair_invoice_basis_${packageId}`}
          >
            Основание
          </label>

          <select
            id={`repair_invoice_basis_${packageId}`}
            className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
            value={basisKey}
            onChange={(e) => setBasisKey(e.target.value as PackagePaymentBasisOptionKey | '')}
          >
            <option value="">Выберите основание</option>

            {basisOptions.map((opt) => (
              <option key={opt.key} value={opt.key} disabled={opt.disabled}>
                {opt.disabled ? `${opt.label} (уже выставлено)` : opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className={`${cdBase.paymentsHubConductField} ${cdBase.paymentsFormHubAmountField}`}>
          <label
            className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
            htmlFor={`repair_invoice_amount_${packageId}`}
          >
            Итого, ₽
          </label>

          <input
            id={`repair_invoice_amount_${packageId}`}
            readOnly
            className={`${measurementBlankStyles.input} ${cdBase.paymentsHubConductControl}`}
            value={amountDisplay}
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
              onClick={() => void handleIssue()}
            >
              {saving ? 'Сохранение…' : 'Выставить счёт'}
            </button>

            <button
              type="button"
              className={cdBase.paymentsHubConductSecondaryBtn}
              disabled={!formComplete}
              onClick={handlePrint}
            >
              Печать
            </button>

            {onDownload ? (
              <button
                type="button"
                className={cdBase.paymentsHubConductSecondaryBtn}
                disabled={!formComplete || downloadBusy}
                onClick={handleDownloadDraft}
              >
                {downloadBusy ? 'PDF…' : 'Скачать PDF'}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <section className={cdBase.invoiceLinesSection}>
        <h4 className={cdBase.invoiceLinesSectionTitle}>Товары и услуги</h4>

        <p className={cdDocPreview.hint} style={{ marginTop: 0, marginBottom: 8 }}>
          В печатной форме основание уходит в поле «Основание», позиции — в таблицу.{' '}
          {isProductDirectionPackage ? (
            <>
              Автозагрузка — только из счёт-заказа и Д/с (скидка по договору на работы). Позиции по
              изделиям из спецификации добавляйте в таблицу вручную.
              {contractSourceSummaryHint ? <> {contractSourceSummaryHint}.</> : null}
            </>
          ) : (
            <>Суммы из сметы/Д/с — с учётом скидки по договору.</>
          )}
        </p>
        <div className={`${cdBase.invoiceLinesActions} ${cdBase.invoiceLinesLoadRow}`}>
          <div className={cdBase.invoiceLinesLoadField}>
            <label
              className={`${measurementBlankStyles.label} ${cdBase.paymentsHubConductLabel}`}
              htmlFor={`repair_invoice_estimate_source_${packageId}`}
            >
              Загрузить позиции из
            </label>
            <select
              id={`repair_invoice_estimate_source_${packageId}`}
              className={`${measurementBlankStyles.select} ${cdBase.paymentsHubConductControl}`}
              value={estimateLoadSource}
              onChange={(e) =>
                setEstimateLoadSource(e.target.value as PackageInvoiceEstimateSourceId | '')
              }
            >
              <option value="">— выберите документ —</option>
              {estimateSourceOptions.map((opt) => (
                <option key={opt.id} value={opt.id} disabled={opt.disabled}>
                  {formatPackageInvoiceEstimateSourceLabel(opt)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className={cdWorkspace.secondaryBtn}
            disabled={!estimateLoadSource || selectedEstimateSource?.disabled}
            onClick={loadLinesFromEstimate}
          >
            Загрузить в таблицу
          </button>
        </div>
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
              {lineDisplay.grouped
                ? lineDisplay.groups.map((group) => (
                    <Fragment key={group.kind}>
                      <tr className={cdBase.invoiceLinesGroupHeader}>
                        <td colSpan={8}>{group.title}</td>
                      </tr>
                      {group.entries.map(({ index }) => (
                        <PackageIssueInvoiceLineRow
                          key={`line-${index}`}
                          line={lineItems[index]!}
                          index={index}
                          updateLine={updateLine}
                          removeLine={removeLine}
                        />
                      ))}
                    </Fragment>
                  ))
                : lineItems.map((line, index) => (
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

          <button type="button" className={cdWorkspace.secondaryBtn} onClick={resetAllLines}>
            Сбросить все позиции
          </button>
        </div>
      </section>

      {issuedNotice ? (
        <p className={cdBase.paymentsHubConductDoneMsg} role="status" style={{ marginTop: 8 }}>
          Счёт выставлен
        </p>
      ) : null}
    </div>
  );
}
