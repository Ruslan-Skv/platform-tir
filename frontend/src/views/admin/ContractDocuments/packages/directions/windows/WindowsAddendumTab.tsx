'use client';

import type { ComponentProps } from 'react';

import cdChrome from '../../../styles/editor-chrome.module.css';
import cdWindows from '../../../styles/windows-package.module.css';
import { RepairAddendumEstimateBlock } from '../../directions/repair/estimates/RepairAddendumEstimateBlock';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../shared/editor/packageLockNoticeUi';
import type { RepairAddendumSlotEstimateBlock } from '../repair/repairPackageForm';
import { WindowsAddendumGrandTotalsSummary } from './WindowsAddendumGrandTotalsSummary';
import { WindowsAddendumSpecificationLinesEditor } from './WindowsAddendumSpecificationLinesEditor';
import {
  type WindowsAddendumSpecificationLine,
  newWindowsAddendumSpecificationLine,
} from './windowsAddendumSpecification';
import {
  WINDOWS_ADDENDUM_FIELD,
  WINDOWS_ADDENDUM_FORM_GRID,
  WINDOWS_ADDENDUM_ROOT,
  WINDOWS_ADDENDUM_SECTION_CARD,
  WINDOWS_ADDENDUM_SECTION_HEADER,
  WINDOWS_ADDENDUM_SECTION_TITLE,
  WINDOWS_ADDENDUM_SECTION_TITLE_MAIN,
} from './windowsAddendumTabUi';

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
  const signedLockNotice = readOnly ? (
    <PackageLockNotice>
      {packageLockNoticeMessage('addendum', { slotOrdinal, productDirection: true })}
    </PackageLockNotice>
  ) : null;

  return (
    <div className={WINDOWS_ADDENDUM_ROOT}>
      <div className={WINDOWS_ADDENDUM_FORM_GRID}>
        <div className={WINDOWS_ADDENDUM_SECTION_CARD}>
          <div className={WINDOWS_ADDENDUM_SECTION_HEADER}>
            <h3
              className={`${WINDOWS_ADDENDUM_SECTION_TITLE} ${WINDOWS_ADDENDUM_SECTION_TITLE_MAIN}`}
            >
              Дополнительное соглашение №{slotOrdinal}
            </h3>
          </div>
          {signedLockNotice}
          <div className={cdChrome.repairAddendumMetaInlineRow}>
            <div className={`${WINDOWS_ADDENDUM_FIELD} ${cdChrome.repairAddendumDateFieldRow}`}>
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
            <div
              className={`${WINDOWS_ADDENDUM_FIELD} ${cdChrome.repairAddendumWorkPeriodIncreaseFieldRow}`}
            >
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

          <section className={cdWindows.windowsAddendumMajorSection}>
            <h3 className={cdWindows.windowsAddendumMajorHeading}>1. Изменения в Спецификации</h3>
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

          <section className={cdWindows.windowsAddendumMajorSection}>
            <h3 className={cdWindows.windowsAddendumMajorHeading}>2. Изменения в Счёт-заказе</h3>
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
