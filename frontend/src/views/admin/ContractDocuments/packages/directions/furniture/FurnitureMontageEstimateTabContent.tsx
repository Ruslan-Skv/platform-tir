'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useCallback, useMemo } from 'react';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdWorkspace from '../../../styles/estimates-workspace.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../platform/editor/shared/packageLockNoticeUi';
import styles from './FurnitureMontageEstimateTabContent.module.css';
import type { FurnitureMontageDocs, FurnitureMontageLine } from './furnitureMontageDocs';
import {
  formatFurnitureMontageLineTotal,
  formatFurnitureMontageMoney,
  furnitureMontageLinesTotal,
  newFurnitureMontageLine,
  resolveFurnitureMontageLineTotal,
} from './furnitureMontageDocs';

type Props = {
  docs: FurnitureMontageDocs;
  contractNumberLabel: string;
  disabled?: boolean;
  onChange: (docs: FurnitureMontageDocs) => void;
};

function withSynced(line: FurnitureMontageLine): FurnitureMontageLine {
  return { ...line, lineTotal: formatFurnitureMontageLineTotal(line) };
}

const GROUP_LABEL: Record<FurnitureMontageLine['group'], string> = {
  assembly: 'Сборка',
  extra: 'Доп. работы',
  stone: 'Камень',
  custom: 'Прочее',
};

export function FurnitureMontageEstimateTabContent({
  docs,
  contractNumberLabel,
  disabled = false,
  onChange,
}: Props) {
  const setLines = useCallback(
    (estimateLines: FurnitureMontageLine[]) => {
      onChange({ ...docs, estimateLines: estimateLines.map(withSynced) });
    },
    [docs, onChange]
  );

  const total = useMemo(() => furnitureMontageLinesTotal(docs.estimateLines), [docs.estimateLines]);

  return (
    <div className={`${cdDataTab.blockData} ${cdProduct.blockData} ${styles.wrap}`}>
      {disabled ? (
        <PackageLockNotice>
          {packageLockNoticeMessage('estimate', { productDirection: true })}
        </PackageLockNotice>
      ) : null}
      <h3 className={cdEstimateTab.sectionTitle}>
        Счёт-заказ монтажа
        {contractNumberLabel ? ` · ${contractNumberLabel}` : ''}
      </h3>
      <p className={styles.hint}>
        Позиции работ монтажа. Итог записывается в стоимость договора на монтаж (нога «Монтаж»).
      </p>
      <div className={cdProduct.windowsAddendumSpecTableWrap}>
        <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.table}`}>
          <thead>
            <tr>
              <th>#</th>
              <th>Группа</th>
              <th>Наименование</th>
              <th>Цена</th>
              <th>Кол-во</th>
              <th>Сумма</th>
              {!disabled ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {docs.estimateLines.map((line, index) => (
              <tr key={line.id}>
                <td>{index + 1}</td>
                <td>{GROUP_LABEL[line.group]}</td>
                <td>
                  <input
                    value={line.name}
                    disabled={disabled}
                    onChange={(e) => {
                      const next = [...docs.estimateLines];
                      next[index] = withSynced({ ...line, name: e.target.value });
                      setLines(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    value={line.unitPrice}
                    disabled={disabled}
                    inputMode="decimal"
                    onChange={(e) => {
                      const next = [...docs.estimateLines];
                      next[index] = withSynced({ ...line, unitPrice: e.target.value });
                      setLines(next);
                    }}
                  />
                </td>
                <td>
                  <input
                    value={line.quantity}
                    disabled={disabled}
                    inputMode="decimal"
                    onChange={(e) => {
                      const next = [...docs.estimateLines];
                      next[index] = withSynced({ ...line, quantity: e.target.value });
                      setLines(next);
                    }}
                  />
                </td>
                <td className={styles.amount}>
                  {formatFurnitureMontageMoney(resolveFurnitureMontageLineTotal(line))}
                </td>
                {!disabled ? (
                  <td>
                    <button
                      type="button"
                      className={cdWorkspace.secondaryBtn}
                      onClick={() =>
                        setLines(docs.estimateLines.filter((row) => row.id !== line.id))
                      }
                      disabled={docs.estimateLines.length <= 1}
                    >
                      ×
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!disabled ? (
        <button
          type="button"
          className={`${cdWorkspace.secondaryBtn} ${cdProduct.windowsAddendumSpecAddBtn}`}
          onClick={() => setLines([...docs.estimateLines, newFurnitureMontageLine()])}
        >
          <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
          Добавить работу
        </button>
      ) : null}
      <p className={styles.total}>
        Итого по счёт-заказу: {formatFurnitureMontageMoney(total)} руб.
      </p>
    </div>
  );
}
