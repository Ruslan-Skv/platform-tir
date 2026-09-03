'use client';

import { PlusIcon } from '@heroicons/react/24/outline';

import { useCallback, useMemo } from 'react';

import cdDataTab from '../../../styles/data-tab.module.css';
import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdProduct from '../../../styles/product-package.module.css';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../platform/editor/shared/packageLockNoticeUi';
import styles from './FurnitureAppliancesListTabContent.module.css';
import type {
  FurnitureAppliancesDocs,
  FurnitureAppliancesLine,
  FurnitureAppliancesLineGroup,
} from './furnitureAppliancesDocs';
import {
  formatFurnitureAppliancesLineTotal,
  formatFurnitureAppliancesMoney,
  furnitureAppliancesLinesTotal,
  newFurnitureAppliancesLine,
} from './furnitureAppliancesDocs';

type Props = {
  docs: FurnitureAppliancesDocs;

  contractNumberLabel: string;

  disabled?: boolean;

  onChange: (docs: FurnitureAppliancesDocs) => void;
};

function withSynced(line: FurnitureAppliancesLine): FurnitureAppliancesLine {
  return { ...line, lineTotal: formatFurnitureAppliancesLineTotal(line) };
}

const GROUP_TITLE: Record<FurnitureAppliancesLineGroup, string> = {
  appliances: 'Бытовая техника',

  plumbing: 'Сантехника',
};

export function FurnitureAppliancesListTabContent({
  docs,

  contractNumberLabel,

  disabled = false,

  onChange,
}: Props) {
  const setLines = useCallback(
    (lines: FurnitureAppliancesLine[]) => {
      onChange({ ...docs, lines: lines.map(withSynced) });
    },

    [docs, onChange]
  );

  const appliancesTotal = useMemo(
    () => furnitureAppliancesLinesTotal(docs.lines, 'appliances'),

    [docs.lines]
  );

  const plumbingTotal = useMemo(
    () => furnitureAppliancesLinesTotal(docs.lines, 'plumbing'),

    [docs.lines]
  );

  const grandTotal = appliancesTotal + plumbingTotal;

  const renderGroup = (group: FurnitureAppliancesLineGroup) => {
    const groupLines = docs.lines

      .map((line, index) => ({ line, index }))

      .filter(({ line }) => line.group === group);

    const groupSum = group === 'appliances' ? appliancesTotal : plumbingTotal;

    return (
      <section key={group} className={styles.section} aria-label={GROUP_TITLE[group]}>
        <h4 className={styles.subTitle}>{GROUP_TITLE[group]}</h4>

        <div className={cdProduct.windowsAddendumSpecTableWrap}>
          <table className={`${cdProduct.windowsAddendumSpecTable} ${styles.table}`}>
            <thead>
              <tr>
                <th>#</th>

                <th>Наименование</th>

                <th>Цвет</th>

                <th>Цена</th>

                <th>Кол-во</th>

                <th>Стоимость</th>

                {!disabled ? <th /> : null}
              </tr>
            </thead>

            <tbody>
              {groupLines.map(({ line, index }, localIdx) => (
                <tr key={line.id}>
                  <td>{localIdx + 1}</td>

                  <td>
                    <input
                      value={line.name}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.lines];

                        next[index] = withSynced({ ...line, name: e.target.value });

                        setLines(next);
                      }}
                    />
                  </td>

                  <td>
                    <input
                      value={line.color}
                      disabled={disabled}
                      onChange={(e) => {
                        const next = [...docs.lines];

                        next[index] = withSynced({ ...line, color: e.target.value });

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
                        const next = [...docs.lines];

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
                        const next = [...docs.lines];

                        next[index] = withSynced({ ...line, quantity: e.target.value });

                        setLines(next);
                      }}
                    />
                  </td>

                  <td className={styles.amount}>{line.lineTotal || '—'}</td>

                  {!disabled ? (
                    <td>
                      <button
                        type="button"
                        className={cdProduct.windowsAddendumSpecRemove}
                        aria-label="Удалить строку"
                        onClick={() => setLines(docs.lines.filter((_, i) => i !== index))}
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
            className={cdProduct.windowsAddendumSpecAdd}
            onClick={() => setLines([...docs.lines, newFurnitureAppliancesLine({ group })])}
          >
            <PlusIcon width={16} height={16} aria-hidden />
            Добавить позицию
          </button>
        ) : null}

        <p className={styles.subtotal}>
          Всего {GROUP_TITLE[group].toLowerCase()}: {formatFurnitureAppliancesMoney(groupSum)} ₽
        </p>
      </section>
    );
  };

  return (
    <div className={`${cdDataTab.blockData} ${cdProduct.blockData} ${styles.wrap}`}>
      {disabled ? (
        <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
      ) : null}

      <h3 className={cdEstimateTab.sectionTitle}>
        Перечень товара
        {contractNumberLabel ? ` · ${contractNumberLabel}` : ''}
      </h3>

      <p className={styles.hint}>
        Бытовая техника и сантехника (Excel «Переч»). Итог записывается в стоимость договора на
        технику; предоплата — 100%.
      </p>

      {renderGroup('appliances')}

      {renderGroup('plumbing')}

      <p className={styles.total}>
        Итого стоимость: {formatFurnitureAppliancesMoney(grandTotal)} ₽
      </p>
    </div>
  );
}
