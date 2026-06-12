'use client';

import type { ComponentProps } from 'react';

import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { PackageAddendumEstimateBlock } from '../../../platform/editor/addendum/PackageAddendumEstimateBlock';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../../platform/editor/shared/packageLockNoticeUi';
import type { PackageAddendumSlotEstimateBlock } from '../../../platform/form/packageForm';
import { ProductAddendumGrandTotalsSummary } from './ProductAddendumGrandTotalsSummary';
import { ProductAddendumSpecificationLinesEditor } from './ProductAddendumSpecificationLinesEditor';
import {
  type ProductAddendumSpecificationLine,
  newProductAddendumSpecificationLine,
} from './addendumSpecification';
import {
  PRODUCT_ADDENDUM_FIELD,
  PRODUCT_ADDENDUM_FORM_GRID,
  PRODUCT_ADDENDUM_ROOT,
  PRODUCT_ADDENDUM_SECTION_CARD,
  PRODUCT_ADDENDUM_SECTION_HEADER,
  PRODUCT_ADDENDUM_SECTION_TITLE,
  PRODUCT_ADDENDUM_SECTION_TITLE_MAIN,
} from './addendumTabClassNames';

type Props = {
  slotOrdinal: number;
  slot: PackageAddendumSlotEstimateBlock;
  documentDate: string;
  onDocumentDateChange: (value: string) => void;
  workPeriodIncreaseDays: string;
  onWorkPeriodIncreaseDaysChange: (value: string) => void;
  onSpecificationAddedLinesChange: (lines: ProductAddendumSpecificationLine[]) => void;
  onSpecificationExcludedLinesChange: (lines: ProductAddendumSpecificationLine[]) => void;
  contractDiscountPercent: string;
  estimateBlockProps: ComponentProps<typeof PackageAddendumEstimateBlock>;
};

function ensureAtLeastOneLine(
  lines: ProductAddendumSpecificationLine[] | undefined
): ProductAddendumSpecificationLine[] {
  if (lines && lines.length > 0) return lines;
  return [newProductAddendumSpecificationLine()];
}

export function ProductAddendumTab({
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
    <div className={PRODUCT_ADDENDUM_ROOT}>
      <div className={PRODUCT_ADDENDUM_FORM_GRID}>
        <div className={PRODUCT_ADDENDUM_SECTION_CARD}>
          <div className={PRODUCT_ADDENDUM_SECTION_HEADER}>
            <h3
              className={`${PRODUCT_ADDENDUM_SECTION_TITLE} ${PRODUCT_ADDENDUM_SECTION_TITLE_MAIN}`}
            >
              Дополнительное соглашение №{slotOrdinal}
            </h3>
          </div>
          {signedLockNotice}
          <div className={cdChrome.packageAddendumMetaInlineRow}>
            <div className={`${PRODUCT_ADDENDUM_FIELD} ${cdChrome.packageAddendumDateFieldRow}`}>
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
              className={`${PRODUCT_ADDENDUM_FIELD} ${cdChrome.packageAddendumWorkPeriodIncreaseFieldRow}`}
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

          <section className={cdProduct.windowsAddendumMajorSection}>
            <h3 className={cdProduct.windowsAddendumMajorHeading}>1. Изменения в Спецификации</h3>
            <ProductAddendumSpecificationLinesEditor
              title="Дополнительные изделия к заказу"
              totalMode="increase"
              lines={ensureAtLeastOneLine(slot.specificationAddedLines)}
              readOnly={readOnly}
              onChange={onSpecificationAddedLinesChange}
            />
            <ProductAddendumSpecificationLinesEditor
              title="Изделия, исключённые из заказа (или уменьшение количества)"
              hint="Укажите изделия, которые исключаются из заказа, или уменьшенное количество."
              totalMode="decrease"
              lines={ensureAtLeastOneLine(slot.specificationExcludedLines)}
              readOnly={readOnly}
              onChange={onSpecificationExcludedLinesChange}
            />
          </section>

          <section className={cdProduct.windowsAddendumMajorSection}>
            <h3 className={cdProduct.windowsAddendumMajorHeading}>2. Изменения в Счёт-заказе</h3>
            <PackageAddendumEstimateBlock {...estimateBlockProps} layout="accountOrderOnly" />
          </section>

          <ProductAddendumGrandTotalsSummary
            slot={slot}
            contractDiscountPercent={contractDiscountPercent}
          />
        </div>
      </div>
    </div>
  );
}
