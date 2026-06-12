'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import attachStyles from '../../../platform/editor/estimateTab/PackageEstimateAttach.module.css';
import {
  type ProductAddendumSectionTotalMode,
  type ProductAddendumSpecificationLine,
  formatProductAddendumLineAmount,
  formatWindowsAddendumMoney,
  newProductAddendumSpecificationLine,
  resolveProductAddendumLineAmount,
} from './addendumSpecification';
import { PRODUCT_ADDENDUM_HINT } from './addendumTabClassNames';

type Props = {
  title: string;
  hint?: string;
  totalMode?: ProductAddendumSectionTotalMode;
  lines: ProductAddendumSpecificationLine[];
  readOnly: boolean;
  onChange: (lines: ProductAddendumSpecificationLine[]) => void;
};

function withSyncedAmount(
  line: ProductAddendumSpecificationLine
): ProductAddendumSpecificationLine {
  return { ...line, amount: formatProductAddendumLineAmount(line) };
}

export function ProductAddendumSpecificationLinesEditor({
  title,
  hint,
  totalMode = 'increase',
  lines,
  readOnly,
  onChange,
}: Props) {
  const sectionTotal = useMemo(
    () => lines.reduce((sum, line) => sum + resolveProductAddendumLineAmount(line), 0),
    [lines]
  );

  const updateLine = (id: string, patch: Partial<ProductAddendumSpecificationLine>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        return withSyncedAmount({ ...line, ...patch });
      })
    );
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((line) => line.id !== id));
  };

  const addLine = () => {
    onChange([...lines, newProductAddendumSpecificationLine()]);
  };

  return (
    <div className={cdProduct.windowsAddendumSpecSubsection}>
      <h4 className={cdProduct.windowsAddendumSubsectionHeading}>{title}</h4>
      {hint ? <p className={PRODUCT_ADDENDUM_HINT}>{hint}</p> : null}
      <div className={cdProduct.windowsAddendumSpecTableWrap}>
        <table className={cdProduct.windowsAddendumSpecTable}>
          <colgroup>
            <col className={cdProduct.windowsAddendumSpecColIndex} />
            <col className={cdProduct.windowsAddendumSpecColName} />
            <col className={cdProduct.windowsAddendumSpecColQty} />
            <col className={cdProduct.windowsAddendumSpecColUnit} />
            <col className={cdProduct.windowsAddendumSpecColPrice} />
            <col className={cdProduct.windowsAddendumSpecColAmount} />
            <col className={cdProduct.windowsAddendumSpecColActions} />
          </colgroup>
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование изделия</th>
              <th>Кол-во</th>
              <th>Ед.</th>
              <th>Цена, руб.</th>
              <th>Сумма, руб.</th>
              <th aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className={cdProduct.windowsAddendumSpecIndexCell}>{index + 1}</td>
                <td className={cdProduct.windowsAddendumSpecNameCell}>
                  <input
                    type="text"
                    value={line.name}
                    onChange={(e) => updateLine(line.id, { name: e.target.value })}
                    placeholder="Наименование"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.quantity}
                    onChange={(e) => updateLine(line.id, { quantity: e.target.value })}
                    placeholder="1"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.unit}
                    onChange={(e) => updateLine(line.id, { unit: e.target.value })}
                    placeholder="шт."
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.price}
                    onChange={(e) => updateLine(line.id, { price: e.target.value })}
                    placeholder="0,00"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td className={cdProduct.windowsAddendumSpecAmountCell}>
                  <input
                    type="text"
                    value={formatProductAddendumLineAmount(line)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title="Сумма = Кол-во × Цена"
                    className={cdProduct.windowsAddendumSpecAmountReadonly}
                  />
                </td>
                <td className={cdProduct.windowsAddendumSpecActionsCell}>
                  <button
                    type="button"
                    className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn}`}
                    aria-label="Удалить строку"
                    title="Удалить"
                    disabled={readOnly || lines.length <= 1}
                    onClick={() => removeLine(line.id)}
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={cdProduct.windowsAddendumSpecActionsRow}>
        <button
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn} ${cdProduct.windowsAddendumSpecAddBtn}`}
          aria-label="Добавить изделие"
          title="Добавить изделие"
          disabled={readOnly}
          onClick={addLine}
        >
          <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
        </button>
        <p className={cdProduct.windowsAddendumSpecSectionTotal}>
          {totalMode === 'decrease' ? 'Итого по разделу (уменьшение)' : 'Итого по разделу'}:{' '}
          {totalMode === 'decrease' ? '−' : ''}
          {formatWindowsAddendumMoney(sectionTotal)} руб.
        </p>
      </div>
    </div>
  );
}
