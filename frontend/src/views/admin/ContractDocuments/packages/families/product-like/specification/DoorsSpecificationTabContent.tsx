'use client';

import cdDataTab from '../../../../styles/data-tab.module.css';
import cdDocPreview from '../../../../styles/documents-preview.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdHubModals from '../../../../styles/hub-modals.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import cdTemplates from '../../../../styles/templates-library.module.css';
import {
  PackageLockNotice,
  packageLockNoticeMessage,
} from '../../../platform/editor/shared/packageLockNoticeUi';
import { DoorsSpecificationLinesEditor } from './DoorsSpecificationLinesEditor';
import { DoorsSpecificationPreviewSheet } from './DoorsSpecificationPreviewSheet';
import {
  type DoorsSpecificationLine,
  ensureAtLeastOneDoorsSpecificationLine,
} from './doorsSpecification';
import { productSpecificationCopy } from './productSpecificationCopy';

const SPEC_TAB_COMPACT = `${cdEstimateTab.estimateTabCompact} ${cdProduct.estimateTabCompact} ${cdHubModals.estimateTabCompact}`;
const SPEC_BLOCK = `${cdDataTab.blockData} ${cdProduct.blockData}`;
const SPEC_DATA_COMPACT = `${cdEstimateTab.dataCompact} ${cdDataTab.dataCompact} ${cdHubModals.dataCompact}`;
const SPEC_FORM_GRID = `${cdDataTab.formGrid} ${cdProduct.formGrid}`;
const SPEC_SECTION_CARD = `${cdTemplates.sectionCard} ${cdEstimateTab.sectionCard}`;
const SPEC_SECTION_FIELDS = `${cdTemplates.sectionFields} ${cdEstimateTab.sectionFields}`;
const SPEC_SECTION_TITLE = cdEstimateTab.sectionTitle;
const SPEC_SECTION_TITLE_MAIN = `${cdTemplates.estimateSectionTitle} ${cdEstimateTab.estimateSectionTitle}`;
const SPEC_HINT = `${cdDocPreview.hint} ${cdTemplates.hint}`;
const SPEC_FIELD = `${cdHubModals.field} ${cdDataTab.field} ${cdEstimateTab.field}`;
const SPEC_A4_WRAP = `${cdDocPreview.estimateA4Wrap} ${cdEstimateTab.estimateA4Wrap}`;
const SPEC_ROOT = `${SPEC_BLOCK} ${SPEC_DATA_COMPACT} ${SPEC_TAB_COMPACT} ${cdProduct.windowsContractTabTypography}`;

type DoorsSpecificationTabContentProps = {
  lines: DoorsSpecificationLine[];
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  discountPercent: string;
  disabled?: boolean;
  onLinesChange: (lines: DoorsSpecificationLine[]) => void;
  onDiscountPercentChange: (value: string) => void;
};

export function DoorsSpecificationTabContent({
  lines,
  contractNumberLabel,
  contractDateLabel,
  directorName,
  customerFullName,
  discountPercent,
  disabled = false,
  onLinesChange,
  onDiscountPercentChange,
}: DoorsSpecificationTabContentProps) {
  const editorLines = ensureAtLeastOneDoorsSpecificationLine(lines);
  const copy = productSpecificationCopy('DOORS');

  return (
    <div className={SPEC_ROOT}>
      <div className={SPEC_FORM_GRID}>
        <div className={`${SPEC_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          {disabled ? (
            <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
          ) : null}
          <h3 className={`${SPEC_SECTION_TITLE} ${SPEC_SECTION_TITLE_MAIN}`}>Спецификация</h3>
          <p className={SPEC_HINT} style={{ marginTop: 0 }}>
            {copy.hint}
          </p>
          <div className={`${SPEC_SECTION_FIELDS} ${cdProduct.doorsSpecificationFieldsRow}`}>
            <div
              className={`${SPEC_FIELD} ${cdHubModals.windowsSpecAmountField} ${cdProduct.doorsSpecificationDiscountField}`}
            >
              <label htmlFor="doors-specification-discount">Скидка по спецификации, %</label>
              <input
                id="doors-specification-discount"
                type="text"
                inputMode="decimal"
                value={discountPercent}
                disabled={disabled}
                placeholder="0"
                autoComplete="off"
                onChange={(e) => onDiscountPercentChange(e.target.value)}
              />
            </div>
          </div>
          <DoorsSpecificationLinesEditor
            lines={editorLines}
            readOnly={disabled}
            onChange={onLinesChange}
          />
        </div>

        <div
          className={`${cdEstimateTab.fieldSpanAll} ${cdProduct.estimateSheetField}`}
          aria-hidden
        >
          <div className={SPEC_A4_WRAP}>
            <DoorsSpecificationPreviewSheet
              contractNumberLabel={contractNumberLabel}
              contractDateLabel={contractDateLabel}
              lines={editorLines}
              directorName={directorName}
              customerFullName={customerFullName}
              discountPercent={discountPercent}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
