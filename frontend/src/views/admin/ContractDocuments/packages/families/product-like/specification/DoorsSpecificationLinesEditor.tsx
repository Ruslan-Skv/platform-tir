'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import cdWorkspace from '../../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import attachStyles from '../../../platform/editor/estimateTab/PackageEstimateAttach.module.css';
import {
  type DoorsSpecificationLine,
  formatDoorsSpecificationLineTotal,
  formatDoorsSpecificationMoney,
  newDoorsSpecificationLine,
  resolveDoorsSpecificationLineTotal,
} from './doorsSpecification';

type Props = {
  lines: DoorsSpecificationLine[];
  readOnly: boolean;
  onChange: (lines: DoorsSpecificationLine[]) => void;
};

function withSyncedTotal(line: DoorsSpecificationLine): DoorsSpecificationLine {
  return { ...line, lineTotal: formatDoorsSpecificationLineTotal(line) };
}

export function DoorsSpecificationLinesEditor({ lines, readOnly, onChange }: Props) {
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
            <col className={cdProduct.doorsSpecificationColName} />
            <col className={cdProduct.doorsSpecificationColSize} />
            <col className={cdProduct.doorsSpecificationColColor} />
            <col className={cdProduct.doorsSpecificationColOpening} />
            <col className={cdProduct.doorsSpecificationColQty} />
            <col className={cdProduct.doorsSpecificationColPrice} />
            <col className={cdProduct.doorsSpecificationColAmount} />
            <col className={cdProduct.doorsSpecificationColActions} />
          </colgroup>
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование</th>
              <th>Размер</th>
              <th>Цвет</th>
              <th title="Сторона открывания (Тип)">Сторона откр.</th>
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
                <td>
                  <input
                    type="text"
                    value={line.name}
                    onChange={(e) => updateLine(line.id, { name: e.target.value })}
                    placeholder="Дверь, фурнитура, наличник…"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.size}
                    onChange={(e) => updateLine(line.id, { size: e.target.value })}
                    placeholder="800×2000"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.color}
                    onChange={(e) => updateLine(line.id, { color: e.target.value })}
                    placeholder="Белый"
                    disabled={readOnly}
                    autoComplete="off"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={line.openingSide}
                    onChange={(e) => updateLine(line.id, { openingSide: e.target.value })}
                    placeholder="Левая"
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
