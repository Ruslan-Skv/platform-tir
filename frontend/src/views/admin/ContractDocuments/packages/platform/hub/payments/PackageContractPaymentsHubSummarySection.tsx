'use client';

import { Fragment } from 'react';

import crmDetailStyles from '@/views/admin/CRM/Customers/modals/CrmCustomerDetailModal.module.css';

import cdBase from '../../../../styles/base.module.css';
import cdDataTab from '../../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { isFurnitureLikePackageKind } from '../../../config';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import {
  formatHubDiscountCell,
  formatMoneyRub,
  formatPercentOfGrandTotal,
} from './packageContractPaymentsFormat';
import type { PackageContractPaymentsTabModel } from './usePackageContractPaymentsTab';

export type PackageContractPaymentsHubSummarySectionProps = Pick<
  PackageContractPaymentsTabModel,
  | 'packageKind'
  | 'form'
  | 'loading'
  | 'isHubSummaryLayout'
  | 'addendumPaymentSummaries'
  | 'paymentsContractDiscountPct'
  | 'payableBreakdown'
  | 'windowsCostBreakdown'
  | 'paidAllocations'
  | 'journalPaidRub'
  | 'grandTotalRub'
  | 'mainContractPctOfGrand'
  | 'journalPaidPctOfGrand'
  | 'balancePerJournalRub'
  | 'balancePctOfGrand'
  | 'rows'
>;

export function PackageContractPaymentsHubSummarySection({
  packageKind,
  form,
  loading,
  isHubSummaryLayout,
  addendumPaymentSummaries,
  paymentsContractDiscountPct,
  payableBreakdown,
  windowsCostBreakdown,
  paidAllocations,
  journalPaidRub,
  grandTotalRub,
  mainContractPctOfGrand,
  journalPaidPctOfGrand,
  balancePerJournalRub,
  balancePctOfGrand,
  rows,
}: PackageContractPaymentsHubSummarySectionProps) {
  const renderHubPaidValue = (paidRub: number, costRub: number | null | undefined) => {
    const pct = formatPercentOfGrandTotal(paidRub, costRub);
    return (
      <>
        {formatMoneyRub(paidRub)}
        {pct != null ? <span className={cdBase.paymentsHubCompactPct}> ({pct})</span> : null}
      </>
    );
  };

  const renderHubRemainderValue = (paidRub: number, costRub: number | null | undefined) => {
    if (costRub == null || !Number.isFinite(costRub)) return '—';
    const remainderRub = costRub - paidRub;
    const pct = formatPercentOfGrandTotal(remainderRub, costRub);
    return (
      <span className={remainderRub < -0.5 ? cdBase.paymentsKvOverpay : undefined}>
        {formatMoneyRub(remainderRub)}
        {pct != null ? <span className={cdBase.paymentsHubCompactPct}> ({pct})</span> : null}
      </span>
    );
  };

  if (isHubSummaryLayout) {
    return (
      <>
        <h3 className={`${crmDetailStyles.linkedSectionTitle} ${cdBase.paymentsHubBlockTitle}`}>
          Сводка по договору
        </h3>
        <div
          className={`${cdTemplates.sectionCard} ${cdBase.paymentsPreFormSummaryCard} ${cdBase.paymentsBlockAccentSummary} ${cdBase.paymentsHubCompactCard}`}
        >
          <div className={cdBase.paymentsTableWrap}>
            <table className={`${cdBase.paymentsTable} ${cdBase.paymentsHubSummaryTable}`}>
              <thead>
                <tr>
                  <th></th>
                  <th className={cdBase.paymentsHubSummaryNumCol}>Скидка</th>
                  <th className={cdBase.paymentsHubSummaryNumCol}>Стоимость</th>
                  <th className={cdBase.paymentsHubSummaryNumCol}>Рекоменд. предопл.</th>
                  <th className={cdBase.paymentsHubSummaryNumCol}>Оплачено</th>
                  <th className={cdBase.paymentsHubSummaryNumCol}>Остаток</th>
                </tr>
              </thead>
              <tbody>
                {isProductDirectionPackageKind(packageKind) && windowsCostBreakdown ? (
                  <>
                    <tr>
                      <td>Изделия (спецификация)</td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>
                        {formatMoneyRub(windowsCostBreakdown.productsAmount)}
                      </td>
                      <td
                        className={`${cdBase.paymentsHubSummaryNumCol} ${cdBase.paymentsHubSummaryRecommendedCol}`}
                      >
                        —
                      </td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                    </tr>
                    <tr>
                      <td>Работы (счёт-заказ)</td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>
                        {formatHubDiscountCell(paymentsContractDiscountPct)}
                      </td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>
                        {formatMoneyRub(windowsCostBreakdown.worksAmount)}
                      </td>
                      <td
                        className={`${cdBase.paymentsHubSummaryNumCol} ${cdBase.paymentsHubSummaryRecommendedCol}`}
                      >
                        {form.contract.recommendedPrepayment.trim() || '—'}
                      </td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                      <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                    </tr>
                  </>
                ) : isFurnitureLikePackageKind(packageKind) &&
                  (payableBreakdown.furnitureLegs?.length ?? 0) > 0 ? (
                  payableBreakdown.furnitureLegs!.map((leg) => {
                    const paidRub = paidAllocations.byFurnitureLeg?.get(leg.legId) ?? 0;
                    return (
                      <tr key={`pay_hub_furniture_${leg.legId}`}>
                        <td>{leg.label}</td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {formatMoneyRub(leg.totalRub)}
                        </td>
                        <td
                          className={`${cdBase.paymentsHubSummaryNumCol} ${cdBase.paymentsHubSummaryRecommendedCol}`}
                        >
                          {formatMoneyRub(leg.recommendedPrepaymentRub)}
                        </td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubPaidValue(paidRub, leg.totalRub)}
                        </td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubRemainderValue(paidRub, leg.totalRub)}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td>Договор</td>
                    <td className={cdBase.paymentsHubSummaryNumCol}>
                      {formatHubDiscountCell(paymentsContractDiscountPct)}
                    </td>
                    <td className={cdBase.paymentsHubSummaryNumCol}>
                      {form.contract.totalAmount.trim() ||
                        formatMoneyRub(payableBreakdown.mainContractRub)}
                    </td>
                    <td
                      className={`${cdBase.paymentsHubSummaryNumCol} ${cdBase.paymentsHubSummaryRecommendedCol}`}
                    >
                      {form.contract.recommendedPrepayment.trim() || '—'}
                    </td>
                    <td className={cdBase.paymentsHubSummaryNumCol}>
                      {loading
                        ? '…'
                        : renderHubPaidValue(
                            paidAllocations.contractPaidRub,
                            payableBreakdown.mainContractRub
                          )}
                    </td>
                    <td className={cdBase.paymentsHubSummaryNumCol}>
                      {loading
                        ? '…'
                        : renderHubRemainderValue(
                            paidAllocations.contractPaidRub,
                            payableBreakdown.mainContractRub
                          )}
                    </td>
                  </tr>
                )}
                {addendumPaymentSummaries
                  .filter((row) => row.hasData)
                  .map((row) => {
                    const addendumTotalRub = payableBreakdown.addendumTotalsRub.find(
                      (a) => a.slotIndex1 === row.num
                    )?.totalRub;
                    const paidRub = paidAllocations.byAddendum.get(row.num) ?? 0;
                    return (
                      <tr key={`pay_hub_ds_${row.num}`}>
                        <td>Д/с №{row.num}</td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {formatHubDiscountCell(paymentsContractDiscountPct)}
                        </td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {row.costStr ? `${row.costStr} ₽` : formatMoneyRub(addendumTotalRub)}
                        </td>
                        <td
                          className={`${cdBase.paymentsHubSummaryNumCol} ${cdBase.paymentsHubSummaryRecommendedCol}`}
                        >
                          {row.rec100 ? `${row.rec100} ₽` : '—'}
                        </td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubPaidValue(paidRub, addendumTotalRub)}
                        </td>
                        <td className={cdBase.paymentsHubSummaryNumCol}>
                          {loading ? '…' : renderHubRemainderValue(paidRub, addendumTotalRub)}
                        </td>
                      </tr>
                    );
                  })}
                <tr className={cdBase.paymentsHubSummaryFooterRow}>
                  <td>Итого</td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>
                    {formatMoneyRub(payableBreakdown.grandTotalRub)}
                  </td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>—</td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>
                    {loading ? '…' : renderHubPaidValue(journalPaidRub, grandTotalRub)}
                  </td>
                  <td className={cdBase.paymentsHubSummaryNumCol}>
                    {loading ? '…' : renderHubRemainderValue(journalPaidRub, grandTotalRub)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div
        className={`${cdTemplates.sectionCard} ${cdBase.paymentsDocFieldsCard} ${cdBase.paymentsBlockAccentContract}`}
      >
        <h3 className={cdBase.sectionTitle}>Договор</h3>
        <div className={cdEstimateTab.paymentsContractMoneyRow}>
          <div className={`${cdBase.field} ${cdDataTab.contractInlineField}`}>
            <label htmlFor="pay_tab_cta">Стоимость договора</label>
            <input
              id="pay_tab_cta"
              value={form.contract.totalAmount}
              readOnly
              className={cdEstimateTab.autoFilledInput}
            />
          </div>
          <div className={`${cdBase.field} ${cdDataTab.contractInlineField}`}>
            <label htmlFor="pay_tab_crp">Рекомендованная предоплата (70%)</label>
            <input
              id="pay_tab_crp"
              className={`${cdEstimateTab.autoFilledInput} ${cdBase.paymentsRecommendedAmountInput}`}
              value={form.contract.recommendedPrepayment}
              readOnly
            />
          </div>
        </div>
      </div>

      {addendumPaymentSummaries.map((row) => (
        <div
          key={`pay_ds_${row.num}`}
          className={`${cdTemplates.sectionCard} ${cdBase.paymentsDocFieldsCard} ${cdBase.paymentsBlockAccentAddendum}`}
        >
          <h3 className={cdBase.sectionTitle}>Д/с №{row.num}</h3>
          <div className={cdEstimateTab.paymentsContractMoneyRow}>
            <div className={`${cdBase.field} ${cdDataTab.contractInlineField}`}>
              <label htmlFor={`pay_tab_ds_cost_${row.num}`}>Стоимость</label>
              <input
                id={`pay_tab_ds_cost_${row.num}`}
                value={row.hasData ? row.costStr : '—'}
                readOnly
                className={cdEstimateTab.autoFilledInput}
              />
            </div>
            <div className={`${cdBase.field} ${cdDataTab.contractInlineField}`}>
              <label htmlFor={`pay_tab_ds_rec_${row.num}`}>Рекомендованная оплата (100%)</label>
              <input
                id={`pay_tab_ds_rec_${row.num}`}
                value={row.hasData && row.rec100 ? row.rec100 : '—'}
                readOnly
                className={`${cdEstimateTab.autoFilledInput} ${cdBase.paymentsRecommendedAmountInput}`}
              />
            </div>
          </div>
        </div>
      ))}

      <div
        className={`${cdTemplates.sectionCard} ${cdBase.paymentsPreFormSummaryCard} ${cdBase.paymentsBlockAccentSummary}`}
      >
        <h3 className={cdBase.sectionTitle}>Сводка</h3>
        <div className={cdBase.paymentsPreFormSummarySections}>
          <section className={cdBase.paymentsPreFormSummarySection}>
            <h4 className={cdBase.paymentsPreFormSummaryHeading}>Договор и Д/с</h4>
            {paymentsContractDiscountPct > 0 ? (
              <p className={cdProduct.hint} style={{ margin: '0 0 8px' }}>
                Учтена скидка по договору {String(paymentsContractDiscountPct).replace('.', ',')}
                %: итоговые суммы по Д/с (не по строкам сметы) и поле «Стоимость договора» — после
                скидки.
              </p>
            ) : null}
            <div className={cdBase.paymentsKvGrid}>
              <span className={cdBase.paymentsKvKey}>Договор</span>
              <span className={cdBase.paymentsKvVal}>
                {formatMoneyRub(payableBreakdown.mainContractRub)}
                {mainContractPctOfGrand != null ? (
                  <span className={cdBase.paymentsKvPctSuffix}> · {mainContractPctOfGrand}</span>
                ) : null}
              </span>
              {payableBreakdown.addendumTotalsRub.map(({ slotIndex1, totalRub }) => {
                const addendumPct = formatPercentOfGrandTotal(totalRub, grandTotalRub);
                return (
                  <Fragment key={slotIndex1}>
                    <span className={cdBase.paymentsKvKey}>Д/с №{slotIndex1}</span>
                    <span className={cdBase.paymentsKvVal}>
                      {formatMoneyRub(totalRub)}
                      {addendumPct != null ? (
                        <span className={cdBase.paymentsKvPctSuffix}> · {addendumPct}</span>
                      ) : null}
                    </span>
                  </Fragment>
                );
              })}
              <span className={`${cdBase.paymentsKvKey} ${cdBase.paymentsKvTotalRow}`}>Итого</span>
              <span className={`${cdBase.paymentsKvVal} ${cdBase.paymentsKvTotalRow}`}>
                {formatMoneyRub(payableBreakdown.grandTotalRub)}
                {grandTotalRub != null && grandTotalRub > 0 ? (
                  <span className={cdBase.paymentsKvPctSuffix}> · 100 %</span>
                ) : null}
              </span>
            </div>
          </section>

          <section className={cdBase.paymentsPreFormSummarySection}>
            <h4 className={cdBase.paymentsPreFormSummaryHeading}>Журнал</h4>
            {loading ? (
              <p className={cdProduct.hint}>Загрузка…</p>
            ) : (
              <div className={cdBase.paymentsKvGrid}>
                <span className={cdBase.paymentsKvKey}>Внесено</span>
                <span className={cdBase.paymentsKvVal}>
                  {formatMoneyRub(journalPaidRub)}
                  {journalPaidPctOfGrand != null ? (
                    <span className={cdBase.paymentsKvPctSuffix}> · {journalPaidPctOfGrand}</span>
                  ) : null}
                </span>
                <span className={cdBase.paymentsKvKey}>Строк</span>
                <span className={cdBase.paymentsKvVal}>{rows.length}</span>
              </div>
            )}
          </section>

          <section className={cdBase.paymentsPreFormSummarySection}>
            {loading ? (
              <p className={cdProduct.hint}>Загрузка…</p>
            ) : (
              <div className={cdBase.paymentsKvGrid}>
                <span className={`${cdBase.paymentsKvKey} ${cdBase.paymentsKvTotalRow}`}>
                  Остаток
                </span>
                <span
                  className={`${cdBase.paymentsKvVal} ${cdBase.paymentsKvTotalRow} ${
                    balancePerJournalRub != null && balancePerJournalRub < 0
                      ? cdBase.paymentsKvOverpay
                      : ''
                  }`}
                >
                  {balancePerJournalRub == null ? (
                    '—'
                  ) : (
                    <>
                      {formatMoneyRub(balancePerJournalRub)}
                      {balancePctOfGrand != null ? (
                        <span className={cdBase.paymentsKvPctSuffix}> · {balancePctOfGrand}</span>
                      ) : null}
                    </>
                  )}
                </span>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
