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
import styles from './FurnitureWorkOrderTabContent.module.css';
import type {
  FurnitureMontageDocs,
  FurnitureMontageLine,
  FurnitureWorkOrderManufactureLine,
} from './furnitureMontageDocs';
import {
  formatFurnitureMontageLineTotal,
  formatFurnitureMontageMoney,
  furnitureMontageLinesTotal,
  newFurnitureMontageLine,
  newFurnitureWorkOrderManufactureLine,
  resolveFurnitureMontageLineTotal,
} from './furnitureMontageDocs';

type Props = {
  docs: FurnitureMontageDocs;
  manufactureContractNumber: string;
  montageContractNumber: string;
  disabled?: boolean;
  onChange: (docs: FurnitureMontageDocs) => void;
};

function withSynced<T extends { quantity: string; unitPrice: string; lineTotal: string }>(
  line: T
): T {
  return { ...line, lineTotal: formatFurnitureMontageLineTotal(line) };
}

export function FurnitureWorkOrderTabContent({
  docs,
  manufactureContractNumber,
  montageContractNumber,
  disabled = false,
  onChange,
}: Props) {
  const setManufactureLines = useCallback(
    (workOrderManufactureLines: FurnitureWorkOrderManufactureLine[]) => {
      onChange({
        ...docs,
        workOrderManufactureLines: workOrderManufactureLines.map(withSynced),
      });
    },
    [docs, onChange]
  );

  const setMontageLines = useCallback(
    (estimateLines: FurnitureMontageLine[]) => {
      onChange({ ...docs, estimateLines: estimateLines.map(withSynced) });
    },
    [docs, onChange]
  );

  const manufactureTotal = useMemo(
    () =>
      docs.workOrderManufactureLines.reduce(
        (sum, line) => sum + resolveFurnitureMontageLineTotal(line),
        0
      ),
    [docs.workOrderManufactureLines]
  );
  const montageTotal = useMemo(
    () => furnitureMontageLinesTotal(docs.estimateLines),
    [docs.estimateLines]
  );

  return (
    <div className={`${cdDataTab.blockData} ${cdProduct.blockData} ${styles.wrap}`}>
      {disabled ? (
        <PackageLockNotice>
          {packageLockNoticeMessage('estimate', { productDirection: true })}
        </PackageLockNotice>
      ) : null}
      <h3 className={cdEstimateTab.sectionTitle}>Заказ-наряд</h3>
      <p className={styles.hint}>
        К договорам № {manufactureContractNumber || '—м'} и {montageContractNumber || '—с'}. Блок
        монтажа синхронизирован со счёт-заказом.
      </p>

      <section className={styles.section}>
        <h4 className={styles.subTitle}>Изготовление</h4>
        <div className={cdProduct.windowsAddendumSpecTableWrap}>
          <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.table}`}>
            <thead>
              <tr>
                <th>#</th>
                <th>Наименование</th>
                <th>Цена</th>
                <th>Кол-во</th>
                <th>Сумма</th>
                {!disabled ? <th /> : null}
              </tr>
            </thead>
            <tbody>
              {docs.workOrderManufactureLines.map((line, index) => (
                <tr key={line.id}>
                  <td>{index + 1}</td>
                  <td>
                    <input
                      value={line.name}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.workOrderManufactureLines];
                        next[index] = withSynced({ ...line, name: e.target.value });
                        setManufactureLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.unitPrice}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(e) => {
                        const next = [...docs.workOrderManufactureLines];
                        next[index] = withSynced({ ...line, unitPrice: e.target.value });
                        setManufactureLines(next);
                      }}
                    />
                  </td>
                  <td>
                    <input
                      value={line.quantity}
                      disabled={disabled}
                      inputMode="decimal"
                      onChange={(e) => {
                        const next = [...docs.workOrderManufactureLines];
                        next[index] = withSynced({ ...line, quantity: e.target.value });
                        setManufactureLines(next);
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
                          setManufactureLines(
                            docs.workOrderManufactureLines.filter((row) => row.id !== line.id)
                          )
                        }
                        disabled={docs.workOrderManufactureLines.length <= 1}
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
            onClick={() =>
              setManufactureLines([
                ...docs.workOrderManufactureLines,
                newFurnitureWorkOrderManufactureLine(),
              ])
            }
          >
            <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
            Добавить
          </button>
        ) : null}
        <p className={styles.total}>
          Итого за изгот.: {formatFurnitureMontageMoney(manufactureTotal)} руб.
        </p>
      </section>

      <section className={styles.section}>
        <h4 className={styles.subTitle}>Монтаж</h4>
        <div className={cdProduct.windowsAddendumSpecTableWrap}>
          <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.table}`}>
            <thead>
              <tr>
                <th>#</th>
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
                  <td>
                    <input
                      value={line.name}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.estimateLines];
                        next[index] = withSynced({ ...line, name: e.target.value });
                        setMontageLines(next);
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
                        setMontageLines(next);
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
                        setMontageLines(next);
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
                          setMontageLines(docs.estimateLines.filter((row) => row.id !== line.id))
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
            onClick={() => setMontageLines([...docs.estimateLines, newFurnitureMontageLine()])}
          >
            <PlusIcon className={cdProduct.windowsAddendumSpecAddBtnIcon} aria-hidden />
            Добавить
          </button>
        ) : null}
        <p className={styles.total}>
          Итого за монтаж: {formatFurnitureMontageMoney(montageTotal)} руб.
        </p>
      </section>
    </div>
  );
}
