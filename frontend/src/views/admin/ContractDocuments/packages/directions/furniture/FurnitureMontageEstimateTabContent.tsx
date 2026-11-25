'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useCallback, useMemo } from 'react';

import { AdminTableIconButton } from '@/shared/ui/admin/AdminTableIconButton';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import { DetachEstimateIcon } from '../../platform/editor/shared/DetachEstimateIcon';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../platform/editor/shared/packageLockNoticeUi';
import {
  PACKAGE_TAB_BTN,
  PACKAGE_TAB_BTN_SECONDARY,
  PACKAGE_TAB_CARD,
  PACKAGE_TAB_HEAD,
  PACKAGE_TAB_HINT,
  PACKAGE_TAB_TITLE,
} from '../../platform/ui/packageTabClassNames';
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
    <div
      className={`${cdDataTab.blockData} ${cdProduct.blockData} ${PACKAGE_TAB_CARD} ${styles.wrap}`}
    >
      <div className={PACKAGE_TAB_HEAD}>
        <h3 className={PACKAGE_TAB_TITLE}>
          Счёт-заказ монтажа
          {contractNumberLabel ? ` · ${contractNumberLabel}` : ''}
        </h3>
        {disabled ? (
          <PackageLockNotice>
            {packageLockNoticeMessage('estimate', { productDirection: true })}
          </PackageLockNotice>
        ) : null}
        <p className={PACKAGE_TAB_HINT}>
          Позиции работ монтажа. Итог записывается в стоимость договора на монтаж (нога «Монтаж»).
        </p>
      </div>
      <section className={styles.section}>
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
                      <AdminTableIconButton
                        aria-label="Удалить строку"
                        title="Удалить"
                        onClick={() =>
                          setLines(docs.estimateLines.filter((row) => row.id !== line.id))
                        }
                        disabled={docs.estimateLines.length <= 1}
                      >
                        <DetachEstimateIcon />
                      </AdminTableIconButton>
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
            className={`${PACKAGE_TAB_BTN} ${PACKAGE_TAB_BTN_SECONDARY}`}
            onClick={() => setLines([...docs.estimateLines, newFurnitureMontageLine()])}
          >
            <PlusIcon aria-hidden />
            Добавить работу
          </button>
        ) : null}
        <p className={styles.total}>
          Итого по счёт-заказу: {formatFurnitureMontageMoney(total)} руб.
        </p>
      </section>
    </div>
  );
}
