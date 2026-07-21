'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import type { ContractDocumentPackageKind } from '@/shared/api/admin-contract-document-packages';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import attachStyles from '../../../platform/editor/estimateTab/PackageEstimateAttach.module.css';
import {
  type DoorsSpecificationLine,
  formatDoorsSpecificationLineTotal,
  formatDoorsSpecificationMoney,
  lineSpecificationAttributeColumns,
  lineSpecificationAttributeValue,
  newDoorsSpecificationLine,
  resolveDoorsSpecificationLineTotal,
} from './doorsSpecification';

type Props = {
  packageKind: ContractDocumentPackageKind;
  lines: DoorsSpecificationLine[];
  readOnly: boolean;
  onChange: (lines: DoorsSpecificationLine[]) => void;
};

function withSyncedTotal(line: DoorsSpecificationLine): DoorsSpecificationLine {
  return { ...line, lineTotal: formatDoorsSpecificationLineTotal(line) };
}

const ATTR_COL_CLASS: Record<string, string> = {
  name: cdProduct.doorsSpecificationColName,
  size: cdProduct.doorsSpecificationColSize,
  width: cdProduct.doorsSpecificationColWidth,
  height: cdProduct.doorsSpecificationColHeight,
  color: cdProduct.doorsSpecificationColColor,
  openingSide: cdProduct.doorsSpecificationColOpening,
  mounting: cdProduct.doorsSpecificationColMounting,
  control: cdProduct.doorsSpecificationColControl,
};

export function DoorsSpecificationLinesEditor({ packageKind, lines, readOnly, onChange }: Props) {
  const attributeColumns = useMemo(
    () => lineSpecificationAttributeColumns(packageKind),
    [packageKind]
  );
  const sectionTotal = useMemo(
    () => lines.reduce((sum, line) => sum + resolveDoorsSpecificationLineTotal(line), 0),
    [lines]
  );

  const updateLine = (id: string, patch: Partial<DoorsSpecificationLine>) => {
    onChange(
      lines.map((line) => {
        if (line.id !== id) return line;
        return withSyncedTotal({ ...line, ...patch });
      })
    );
  };

  const removeLine = (id: string) => {
    onChange(lines.filter((line) => line.id !== id));
  };

  const addLine = () => {
    onChange([...lines, newDoorsSpecificationLine()]);
  };

  return (
    <div className={cdProduct.doorsSpecificationEditor}>
      <div className={cdProduct.doorsSpecificationTableWrap}>
        <table className={cdProduct.doorsSpecificationTable}>
          <colgroup>
            <col className={cdProduct.doorsSpecificationColIndex} />
            {attributeColumns.map((col) => (
              <col key={col.id} className={ATTR_COL_CLASS[col.id]} />
            ))}
            <col className={cdProduct.doorsSpecificationColQty} />
            <col className={cdProduct.doorsSpecificationColPrice} />
            <col className={cdProduct.doorsSpecificationColAmount} />
            <col className={cdProduct.doorsSpecificationColActions} />
          </colgroup>
          <thead>
            <tr>
              <th>№</th>
              {attributeColumns.map((col) => (
                <th key={col.id} title={col.title ?? col.label}>
                  {col.shortLabel ?? col.label}
                </th>
              ))}
              <th>Кол-во</th>
              <th>Стоимость</th>
              <th>Сумма</th>
              <th aria-label="Действия" />
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={line.id}>
                <td className={cdProduct.doorsSpecificationIndexCell}>{index + 1}</td>
                {attributeColumns.map((col) => (
                  <td key={col.id}>
                    <input
                      type="text"
                      value={lineSpecificationAttributeValue(line, col.id)}
                      onChange={(e) => updateLine(line.id, { [col.id]: e.target.value })}
                      placeholder={col.placeholder}
                      disabled={readOnly}
                      autoComplete="off"
                    />
                  </td>
                ))}
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
                    value={line.unitPrice}
                    onChange={(e) => updateLine(line.id, { unitPrice: e.target.value })}
                    placeholder="0,00"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td className={cdProduct.doorsSpecificationAmountCell}>
                  <input
                    type="text"
                    value={formatDoorsSpecificationLineTotal(line)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title="Сумма = Кол-во × Стоимость"
                    className={cdProduct.doorsSpecificationAmountReadonly}
                  />
                </td>
                <td className={cdProduct.doorsSpecificationActionsCell}>
                  <button
                    data-admin-mutation
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
      <div className={cdProduct.doorsSpecificationActionsRow}>
        <button
          data-admin-mutation
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${attachStyles.estimateAttachedRemoveBtn} ${cdProduct.doorsSpecificationAddBtn}`}
          aria-label="Добавить позицию"
          title="Добавить позицию"
          disabled={readOnly}
          onClick={addLine}
        >
          <PlusIcon className={cdProduct.doorsSpecificationAddBtnIcon} aria-hidden />
        </button>
        <p className={cdProduct.doorsSpecificationSectionTotal}>
          Итого по спецификации: {formatDoorsSpecificationMoney(sectionTotal)} руб.
        </p>
      </div>
    </div>
  );
}
