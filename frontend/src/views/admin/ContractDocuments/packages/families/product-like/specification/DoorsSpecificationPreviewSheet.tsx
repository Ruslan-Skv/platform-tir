'use client';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdDocPreview from '../../../../styles/documents-preview.module.css';
import { isProductDirectionPackageKind } from '../../../config/productDirectionPackageKind';
import { PackageEstimateSignaturesBlock } from '../../../platform/editor/estimateTab/estimateTabUi';
import { DoorsSpecificationTotalsBlock } from './DoorsSpecificationTotalsBlock';
import {
  type DoorsSpecificationLine,
  doorsSpecificationLineHasContent,
  formatDoorsSpecificationLineTotal,
  formatDoorsSpecificationUnitPrice,
  lineSpecificationAttributeColumns,
  lineSpecificationAttributeValue,
} from './doorsSpecification';
import { productSpecificationCopy } from './productSpecificationCopy';

type DoorsSpecificationPreviewSheetProps = {
  packageKind: ContractDocumentPackageKind;
  contractNumberLabel: string;
  contractDateLabel: string;
  lines: DoorsSpecificationLine[];
  directorName: string;
  customerFullName: string;
  discountPercent: string;
};

/** Превью и печать спецификации товарного направления со строками. */
export function DoorsSpecificationPreviewSheet({
  packageKind,
  contractNumberLabel,
  contractDateLabel,
  lines,
  directorName,
  customerFullName,
  discountPercent,
}: DoorsSpecificationPreviewSheetProps) {
  const rows = lines.filter(doorsSpecificationLineHasContent);
  const copy = productSpecificationCopy(
    isProductDirectionPackageKind(packageKind) ? packageKind : 'DOORS'
  );
  const attributeColumns = lineSpecificationAttributeColumns(packageKind);
  const landscapeSheet = packageKind === 'BLINDS';

  return (
    <article
      className={`${cdDocPreview.estimateA4Sheet}${
        landscapeSheet ? ` ${cdDocPreview.estimateA4SheetLandscape}` : ''
      }`}
      data-print-target="final-estimate-sheet"
      data-page-orientation={landscapeSheet ? 'landscape' : 'portrait'}
    >
      <p className={cdDocPreview.estimateA4AppendixRef}>
        Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
      </p>
      <h4 className={cdDocPreview.estimateA4Title}>{copy.a4Title}</h4>
      {rows.length > 0 ? (
        <table
          className={`${cdDocPreview.doorsSpecificationA4Table} doorsSpecificationA4Table`}
          data-spec-layout={packageKind === 'BLINDS' ? 'blinds' : 'doors'}
        >
          <thead>
            <tr>
              <th>№</th>
              {attributeColumns.map((col) => (
                <th key={col.id}>{col.label}</th>
              ))}
              <th>Кол-во</th>
              <th>Стоимость</th>
              <th>Сумма</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((line, index) => (
              <tr key={line.id}>
                <td>{index + 1}</td>
                {attributeColumns.map((col) => (
                  <td key={col.id}>
                    {lineSpecificationAttributeValue(line, col.id).trim() || '—'}
                  </td>
                ))}
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
