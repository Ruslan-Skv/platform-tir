'use client';

import { useMemo } from 'react';

import styles from '../ContractDocuments.module.css';
import {
  type WindowsAddendumSectionTotalMode,
  type WindowsAddendumSpecificationLine,
  formatWindowsAddendumLineAmount,
  formatWindowsAddendumMoney,
  newWindowsAddendumSpecificationLine,
  resolveWindowsAddendumLineAmount,
} from './windowsAddendumSpecification';

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
    <div className={styles.windowsAddendumSpecSubsection}>
      <h4 className={styles.windowsAddendumSubsectionHeading}>{title}</h4>
      {hint ? <p className={styles.hint}>{hint}</p> : null}
      <div className={styles.windowsAddendumSpecTableWrap}>
        <table className={styles.windowsAddendumSpecTable}>
          <colgroup>
            <col className={styles.windowsAddendumSpecColIndex} />
            <col className={styles.windowsAddendumSpecColName} />
            <col className={styles.windowsAddendumSpecColQty} />
            <col className={styles.windowsAddendumSpecColUnit} />
            <col className={styles.windowsAddendumSpecColPrice} />
            <col className={styles.windowsAddendumSpecColAmount} />
            <col className={styles.windowsAddendumSpecColActions} />
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
                <td className={styles.windowsAddendumSpecIndexCell}>{index + 1}</td>
                <td className={styles.windowsAddendumSpecNameCell}>
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
                <td className={styles.windowsAddendumSpecAmountCell}>
                  <input
                    type="text"
                    value={formatWindowsAddendumLineAmount(line)}
                    readOnly
                    tabIndex={-1}
                    aria-readonly="true"
                    title="Сумма = Кол-во × Цена"
                    className={styles.windowsAddendumSpecAmountReadonly}
                  />
                </td>
                <td className={styles.windowsAddendumSpecActionsCell}>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${styles.estimateAttachedRemoveBtn}`}
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
      <div className={styles.windowsAddendumSpecActionsRow}>
        <button type="button" className={styles.secondaryBtn} disabled={readOnly} onClick={addLine}>
          + Добавить изделие
        </button>
        <p className={styles.windowsAddendumSpecSectionTotal}>
          {totalMode === 'decrease' ? 'Итого по разделу (уменьшение)' : 'Итого по разделу'}:{' '}
          {totalMode === 'decrease' ? '−' : ''}
          {formatWindowsAddendumMoney(sectionTotal)} руб.
        </p>
      </div>
    </div>
  );
}
