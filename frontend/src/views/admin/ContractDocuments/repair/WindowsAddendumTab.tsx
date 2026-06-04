'use client';

import type { ComponentProps } from 'react';

import styles from '../ContractDocuments.module.css';
import { RepairAddendumEstimateBlock } from './RepairAddendumEstimateBlock';
import { WindowsAddendumGrandTotalsSummary } from './WindowsAddendumGrandTotalsSummary';
import { WindowsAddendumSpecificationLinesEditor } from './WindowsAddendumSpecificationLinesEditor';
import type { RepairAddendumSlotEstimateBlock } from './repairPackageForm';
import {
  type WindowsAddendumSpecificationLine,
  newWindowsAddendumSpecificationLine,
} from './windowsAddendumSpecification';

type Props = {
  slotOrdinal: number;
  slot: RepairAddendumSlotEstimateBlock;
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
  workPeriodIncreaseDays: string;
  onWorkPeriodIncreaseDaysChange: (value: string) => void;
  onSpecificationAddedLinesChange: (lines: WindowsAddendumSpecificationLine[]) => void;
  onSpecificationExcludedLinesChange: (lines: WindowsAddendumSpecificationLine[]) => void;
  contractDiscountPercent: string;
  estimateBlockProps: ComponentProps<typeof RepairAddendumEstimateBlock>;
};

function ensureAtLeastOneLine(
  lines: WindowsAddendumSpecificationLine[] | undefined
): WindowsAddendumSpecificationLine[] {
  if (lines && lines.length > 0) return lines;
  return [newWindowsAddendumSpecificationLine()];
}

export function WindowsAddendumTab({
  slotOrdinal,
  slot,
  documentDate,
  onDocumentDateChange,
  workPeriodIncreaseDays,
  onWorkPeriodIncreaseDaysChange,
  onSpecificationAddedLinesChange,
  onSpecificationExcludedLinesChange,
  contractDiscountPercent,
  estimateBlockProps,
}: Props) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';

  return (
    <div
      className={`${styles.blockData} ${styles.dataCompact} ${styles.estimateTabCompact} ${styles.windowsContractTabTypography} ${styles.windowsAddendumTab}`}
    >
      <div className={styles.formGrid}>
        <div className={styles.sectionCard}>
          <div className={styles.estimateSectionHeader}>
            <h3 className={`${styles.sectionTitle} ${styles.estimateSectionTitle}`}>
              Дополнительное соглашение №{slotOrdinal}
            </h3>
          </div>
          <div className={styles.repairAddendumMetaInlineRow}>
            <div className={`${styles.field} ${styles.repairAddendumDateFieldRow}`}>
              <label htmlFor={`windows_addendum_date_${slotOrdinal}`}>
                Дата доп. соглашения (в шапке слева)
              </label>
              <input
                id={`windows_addendum_date_${slotOrdinal}`}
                type="text"
                value={documentDate}
                onChange={(e) => onDocumentDateChange(e.target.value)}
                placeholder="напр. 04.05.2026"
                autoComplete="off"
                disabled={readOnly}
              />
            </div>
            <div className={`${styles.field} ${styles.repairAddendumWorkPeriodIncreaseFieldRow}`}>
              <label htmlFor={`windows_addendum_work_period_increase_${slotOrdinal}`}>
                Увеличение срока по договору
              </label>
              <input
                id={`windows_addendum_work_period_increase_${slotOrdinal}`}
                type="number"
                inputMode="numeric"
                value={workPeriodIncreaseDays}
                onChange={(e) => onWorkPeriodIncreaseDaysChange(e.target.value)}
                placeholder="дн."
                autoComplete="off"
                disabled={readOnly}
                min={0}
                step={1}
              />
            </div>
          </div>

          <section className={styles.windowsAddendumMajorSection}>
            <h3 className={styles.windowsAddendumMajorHeading}>1. Изменения в Спецификации</h3>
            <WindowsAddendumSpecificationLinesEditor
              title="Дополнительные изделия к заказу"
              totalMode="increase"
              lines={ensureAtLeastOneLine(slot.specificationAddedLines)}
              readOnly={readOnly}
              onChange={onSpecificationAddedLinesChange}
            />
            <WindowsAddendumSpecificationLinesEditor
              title="Изделия, исключённые из заказа (или уменьшение количества)"
              hint="Укажите изделия, которые исключаются из заказа, или уменьшенное количество."
              totalMode="decrease"
              lines={ensureAtLeastOneLine(slot.specificationExcludedLines)}
              readOnly={readOnly}
              onChange={onSpecificationExcludedLinesChange}
            />
          </section>

          <section className={styles.windowsAddendumMajorSection}>
            <h3 className={styles.windowsAddendumMajorHeading}>2. Изменения в Счёт-заказе</h3>
            <RepairAddendumEstimateBlock {...estimateBlockProps} layout="accountOrderOnly" />
          </section>

          <WindowsAddendumGrandTotalsSummary
            slot={slot}
            contractDiscountPercent={contractDiscountPercent}
          />
        </div>
      </div>
    </div>
  );
}
