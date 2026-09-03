'use client';

import cdBase from '../../../../styles/base.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import { isFurnitureLikePackageKind } from '../../../config';
import { furniturePaymentLegDisplayLabel } from '../../../directions/furniture/furniturePaymentLeg';
import { PACKAGE_PAYMENT_FORM_LABELS } from '../../payments/packagePaymentFormLabels';
import {
  formatDateRu,
  formatMoneyRub,
  formatPercentOfGrandTotal,
} from './packageContractPaymentsFormat';
import type { PackageContractPaymentsTabModel } from './usePackageContractPaymentsTab';

export type PackageContractPaymentsJournalSectionProps = Pick<
  PackageContractPaymentsTabModel,
  'layout' | 'loading' | 'rows' | 'grandTotalRub' | 'packageKind'
>;

export function PackageContractPaymentsJournalSection({
  layout,
  loading,
  rows,
  grandTotalRub,
  packageKind = 'REPAIR',
}: PackageContractPaymentsJournalSectionProps) {
  const showFurnitureLeg = isFurnitureLikePackageKind(packageKind);

  return (
    <div
      className={`${cdTemplates.sectionCard} ${cdBase.paymentsTableCard} ${cdBase.paymentsBlockAccentJournal}`}
    >
      {layout !== 'journal' ? <h3 className={cdBase.sectionTitle}>Журнал оплат</h3> : null}
      {loading ? (
        <p className={cdProduct.hint}>Загрузка…</p>
      ) : rows.length === 0 ? (
        <p className={cdProduct.hint}>
          {layout === 'journal'
            ? 'Записей пока нет.'
            : 'Записей пока нет. Заполните сумму и основание выше и нажмите «Добавить в журнал».'}
        </p>
      ) : (
        <div className={cdBase.paymentsTableWrap}>
          <table className={cdBase.paymentsTable}>
            <thead>
              <tr>
                <th>Дата</th>
                {showFurnitureLeg ? <th>Договор</th> : null}
                <th>Сумма</th>
                <th className={cdBase.paymentsTablePctCol}>% от итого</th>
                <th>Способ оплаты</th>
                <th>Основание</th>
                <th>Кто внёс</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const rowAmountNum = Number.parseFloat(r.amount);
                const rowRub = Number.isFinite(rowAmountNum) ? rowAmountNum : null;
                const rowPct = formatPercentOfGrandTotal(rowRub, grandTotalRub);
                return (
                  <tr key={r.id}>
                    <td>{formatDateRu(r.paymentDate)}</td>
                    {showFurnitureLeg ? <td>{furniturePaymentLegDisplayLabel(r)}</td> : null}
                    <td>{formatMoneyRub(Number.parseFloat(r.amount))}</td>
                    <td className={cdBase.paymentsTablePctCol}>{rowPct ?? '—'}</td>
                    <td>{PACKAGE_PAYMENT_FORM_LABELS[r.paymentForm] ?? r.paymentForm}</td>
                    <td className={cdBase.paymentsTableBasisCell}>{r.basis?.trim() || '—'}</td>
                    <td className={cdBase.paymentsTableUserCell}>
                      {r.recordedBy
                        ? [r.recordedBy.firstName, r.recordedBy.lastName]
                            .filter(Boolean)
                            .join(' ') || r.recordedBy.email
                        : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
