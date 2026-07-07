'use client';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { PackageEstimateSignaturesBlock } from '../../../platform/editor/estimateTab/estimateTabUi';
import { DoorsSpecificationTotalsBlock } from './DoorsSpecificationTotalsBlock';
import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
  formatDoorsSpecificationLineTotal,
  formatDoorsSpecificationUnitPrice,
} from './doorsSpecification';
import { productSpecificationCopy } from './productSpecificationCopy';

type DoorsSpecificationPreviewSheetProps = {
  contractNumberLabel: string;
  contractDateLabel: string;
  lines: DoorsSpecificationLine[];
  directorName: string;
  customerFullName: string;
  discountPercent: string;
};

/** Превью и печать спецификации «Двери» — те же CSS-классы, что у спецификации «Окна». */
export function DoorsSpecificationPreviewSheet({
  contractNumberLabel,
  contractDateLabel,
  lines,
  directorName,
  customerFullName,
  discountPercent,
}: DoorsSpecificationPreviewSheetProps) {
  const rows = lines.filter(doorsSpecificationLineHasContent);
  const copy = productSpecificationCopy('DOORS');

  return (
    <article className={cdDocPreview.estimateA4Sheet} data-print-target="final-estimate-sheet">
      <p className={cdDocPreview.estimateA4AppendixRef}>
        Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
      </p>
      <h4 className={cdDocPreview.estimateA4Title}>{copy.a4Title}</h4>
      {rows.length > 0 ? (
        <table className={`${cdDocPreview.doorsSpecificationA4Table} doorsSpecificationA4Table`}>
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование</th>
              <th>Размер</th>
              <th>Цвет</th>
              <th>Сторона открывания (Тип)</th>
              <th>Кол-во</th>
              <th>Стоимость</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line, index) => (
              <tr key={line.id}>
                <td>{index + 1}</td>
                <td>{line.name.trim() || '—'}</td>
                <td>{line.size.trim() || '—'}</td>
                <td>{line.color.trim() || '—'}</td>
                <td>{line.openingSide.trim() || '—'}</td>
                <td>{line.quantity.trim() || '—'}</td>
                <td>{formatDoorsSpecificationUnitPrice(line)}</td>
                <td>{formatDoorsSpecificationLineTotal(line)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
      <DoorsSpecificationTotalsBlock lines={lines} discountPercent={discountPercent} />
      <PackageEstimateSignaturesBlock
        directorName={directorName}
        customerFullName={customerFullName}
        executorPartyLabel="Исполнитель"
      />
    </article>
  );
}
