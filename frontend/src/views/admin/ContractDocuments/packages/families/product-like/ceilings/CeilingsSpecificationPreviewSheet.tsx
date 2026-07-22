'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { PackageEstimateSignaturesBlock } from '../../../platform/editor/estimateTab/estimateTabUi';
import {
  type CeilingsSpecification,
  buildCeilingsClientPrintModel,
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
  const { sections, totals, hasContent } = buildCeilingsClientPrintModel(spec);

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

      {sections.map((section) => (
        <div key={section.ceilingTitle} className={cdDocPreview.ceilingsSpecPrintSection}>
          <p className={cdDocPreview.ceilingsSpecPrintCeilingTitle}>{section.ceilingTitle}</p>
          <table
            className={`${cdDocPreview.doorsSpecificationA4Table} doorsSpecificationA4Table`}
            data-spec-layout="ceilings"
          >
            <thead>
              <tr>
                <th>Наименование</th>
                <th>Фактура / артикул / цвет</th>
                <th>Кол-во</th>
                <th>Цена</th>
                <th>Стоимость</th>
              </tr>
            </thead>
            <tbody>
              {section.rows.map((r, i) => (
                <tr key={`${section.ceilingTitle}-${r.name}-${i}`}>
                  <td>{r.name}</td>
                  <td>{r.detail || '—'}</td>
                  <td>
                    {r.qty} {r.unit}
                  </td>
                  <td>{formatCeilingsMoney(r.unitPrice)}</td>
                  <td>{formatCeilingsMoney(r.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {!hasContent ? (
        <p className={cdDocPreview.estimateA4Empty}>Позиции не заполнены.</p>
      ) : (
        <>
          <p className={cdDocPreview.estimateA4Total}>
            Итого: <strong>{formatCeilingsMoney(totals.withExtraMarkup)} руб.</strong>
          </p>
          {totals.discountPercent > 0 ? (
            <>
              <p className={cdDocPreview.estimateA4DiscountMeta}>
                Скидка: {String(totals.discountPercent).replace('.', ',')}%
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
