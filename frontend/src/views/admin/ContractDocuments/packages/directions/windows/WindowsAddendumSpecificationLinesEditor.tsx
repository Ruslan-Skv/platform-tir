'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useMemo } from 'react';

import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdWindows from '../../../styles/windows-package.module.css';
import {
  type WindowsAddendumSectionTotalMode,
  type WindowsAddendumSpecificationLine,
  formatWindowsAddendumLineAmount,
  formatWindowsAddendumMoney,
  newWindowsAddendumSpecificationLine,
  resolveWindowsAddendumLineAmount,
} from './windowsAddendumSpecification';
import { WINDOWS_ADDENDUM_HINT } from './windowsAddendumTabUi';

type Props = {
  title: string;
  hint?: string;
  totalMode?: WindowsAddendumSectionTotalMode;
  lines: WindowsAddendumSpecificationLine[];
  readOnly: boolean;
  onChange: (lines: WindowsAddendumSpecificationLine[]) => void;
};

function withSyncedAmount(
  line: WindowsAddendumSpecificationLine
): WindowsAddendumSpecificationLine {
  return { ...line, amount: formatWindowsAddendumLineAmount(line) };
}

export function WindowsAddendumSpecificationLinesEditor({
  title,
  hint,
  totalMode = 'increase',
  lines,
  readOnly,
  onChange,
}: Props) {
  const sectionTotal = useMemo(
    () => lines.reduce((sum, line) => sum + resolveWindowsAddendumLineAmount(line), 0),
    [lines]
  );

  const updateLine = (id: string, patch: Partial<WindowsAddendumSpecificationLine>) => {
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
    onChange([...lines, newWindowsAddendumSpecificationLine()]);
  };

  return (
    <div className={cdWindows.windowsAddendumSpecSubsection}>
      <h4 className={cdWindows.windowsAddendumSubsectionHeading}>{title}</h4>
      {hint ? <p className={WINDOWS_ADDENDUM_HINT}>{hint}</p> : null}
      <div className={cdWindows.windowsAddendumSpecTableWrap}>
        <table className={cdWindows.windowsAddendumSpecTable}>
          <colgroup>
            <col className={cdWindows.windowsAddendumSpecColIndex} />
            <col className={cdWindows.windowsAddendumSpecColName} />
            <col className={cdWindows.windowsAddendumSpecColQty} />
            <col className={cdWindows.windowsAddendumSpecColUnit} />
            <col className={cdWindows.windowsAddendumSpecColPrice} />
            <col className={cdWindows.windowsAddendumSpecColAmount} />
            <col className={cdWindows.windowsAddendumSpecColActions} />
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
                <td className={cdWindows.windowsAddendumSpecIndexCell}>{index + 1}</td>
                <td className={cdWindows.windowsAddendumSpecNameCell}>
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
                <td className={cdWindows.windowsAddendumSpecAmountCell}>
                  <input
                    type="text"
                    value={formatWindowsAddendumLineAmount(line)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title="Сумма = Кол-во × Цена"
                    className={cdWindows.windowsAddendumSpecAmountReadonly}
                  />
                </td>
                <td className={cdWindows.windowsAddendumSpecActionsCell}>
                  <button
                    type="button"
                    className={`${cdWorkspace.secondaryBtn} ${cdEstimateTab.estimateAttachedRemoveBtn}`}
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
      <div className={cdWindows.windowsAddendumSpecActionsRow}>
        <button
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${cdEstimateTab.estimateAttachedRemoveBtn} ${cdWindows.windowsAddendumSpecAddBtn}`}
          aria-label="Добавить изделие"
          title="Добавить изделие"
          disabled={readOnly}
          onClick={addLine}
        >
          <PlusIcon className={cdWindows.windowsAddendumSpecAddBtnIcon} aria-hidden />
        </button>
        <p className={cdWindows.windowsAddendumSpecSectionTotal}>
          {totalMode === 'decrease' ? 'Итого по разделу (уменьшение)' : 'Итого по разделу'}:{' '}
          {totalMode === 'decrease' ? '−' : ''}
          {formatWindowsAddendumMoney(sectionTotal)} руб.
        </p>
      </div>
    </div>
  );
}
