'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { PackageEstimateSignaturesBlock } from '../../../platform/editor/estimateTab/estimateTabUi';
import {
  type CeilingsSpecification,
  ceilingsSpecificationHasContent,
  computeCeilingsSpecificationNetTotal,
  flattenCeilingsSpecificationRows,
  formatCeilingsMoney,
} from './ceilingsSpecification';

type Props = {
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  spec: CeilingsSpecification;
};

export function CeilingsSpecificationPreviewSheet({
  contractNumberLabel,
  contractDateLabel,
  directorName,
  customerFullName,
  spec,
}: Props) {
  const rows = flattenCeilingsSpecificationRows(spec);
  const totals = computeCeilingsSpecificationNetTotal(spec);
  const hasContent = ceilingsSpecificationHasContent(spec);

  return (
    <article
      className={`${cdDocPreview.estimateA4Sheet} ${cdDocPreview.estimateA4SheetLandscape}`}
      data-print-target="final-estimate-sheet"
      data-page-orientation="landscape"
    >
      <p className={cdDocPreview.estimateA4AppendixRef}>
        Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
      </p>
      <h4 className={cdDocPreview.estimateA4Title}>Спецификация</h4>
      <p className={cdDocPreview.estimateA4DiscountMeta}>
        При выборе потолков учитывать: полотно №1 — самое большое.
      </p>
      {rows.length > 0 ? (
        <table className={`${cdDocPreview.doorsSpecificationA4Table} doorsSpecificationA4Table`}>
          <thead>
            <tr>
              <th>Потолок</th>
              <th>Наименование</th>
              <th>Фактура / артикул / цвет</th>
              <th>Кол-во</th>
              <th>Цена</th>
              <th>Стоимость</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${r.ceilingTitle}-${r.name}-${i}`}>
                <td>{r.ceilingTitle}</td>
                <td>{r.name}</td>
                <td>{r.detail || '—'}</td>
                <td>
                  {r.qty} {r.unit}
                </td>
                <td>{formatCeilingsMoney(Number(String(r.unitPrice).replace(',', '.')) || 0)}</td>
                <td>{formatCeilingsMoney(r.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      {!hasContent ? (
        <p className={cdDocPreview.estimateA4Empty}>Позиции не заполнены.</p>
      ) : (
        <>
          <p className={cdDocPreview.estimateA4Total}>
            Итого по спецификации: <strong>{formatCeilingsMoney(totals.grossTotal)} руб.</strong>
          </p>
          {totals.extraMarkupPercent > 0 ? (
            <>
              <p className={cdDocPreview.estimateA4DiscountMeta}>
                Доп. наценка: {String(totals.extraMarkupPercent).replace('.', ',')}%
              </p>
              <p className={cdDocPreview.estimateA4Total}>
                С учётом наценки:{' '}
                <strong>{formatCeilingsMoney(totals.withExtraMarkup)} руб.</strong>
              </p>
            </>
          ) : null}
          {totals.discountPercent > 0 ? (
            <>
              <p className={cdDocPreview.estimateA4DiscountMeta}>
                Скидка по спецификации: {String(totals.discountPercent).replace('.', ',')}%
              </p>
              <p className={cdDocPreview.estimateA4Total}>
                Итого со скидкой: <strong>{formatCeilingsMoney(totals.netTotal)} руб.</strong>
              </p>
            </>
          ) : null}
        </>
      )}
      <PackageEstimateSignaturesBlock
        directorName={directorName}
        customerFullName={customerFullName}
        executorPartyLabel="Исполнитель"
      />
    </article>
  );
}
