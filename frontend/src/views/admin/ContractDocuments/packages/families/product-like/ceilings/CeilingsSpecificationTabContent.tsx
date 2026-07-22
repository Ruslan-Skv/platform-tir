'use client';

import { useEffect, useState } from 'react';

import {
  type CeilingsPriceItem,
  getCeilingsPriceList,
} from '@/shared/api/admin-contract-document-packages';

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
import { CeilingsSpecificationEditor } from './CeilingsSpecificationEditor';
import { CeilingsSpecificationPreviewSheet } from './CeilingsSpecificationPreviewSheet';
import type { CeilingsSpecification } from './ceilingsSpecification';

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

type Props = {
  spec: CeilingsSpecification;
  contractNumberLabel: string;
  contractDateLabel: string;
  directorName: string;
  customerFullName: string;
  disabled?: boolean;
  onSpecChange: (spec: CeilingsSpecification) => void;
  onError: (message: string) => void;
};

export function CeilingsSpecificationTabContent({
  spec,
  contractNumberLabel,
  contractDateLabel,
  directorName,
  customerFullName,
  disabled = false,
  onSpecChange,
  onError,
}: Props) {
  const [priceItems, setPriceItems] = useState<CeilingsPriceItem[]>([]);
  const [priceLoading, setPriceLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setPriceLoading(true);
    void getCeilingsPriceList()
      .then((data) => {
        if (cancelled) return;
        setPriceItems(data.items);
      })
      .catch((e) => {
        if (!cancelled) {
          onError(e instanceof Error ? e.message : 'Не удалось загрузить прайс потолков');
        }
      })
      .finally(() => {
        if (!cancelled) setPriceLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [onError]);

  return (
    <div className={SPEC_ROOT}>
      <div className={SPEC_FORM_GRID}>
        <div className={`${SPEC_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          {disabled ? (
            <PackageLockNotice>{packageLockNoticeMessage('specification')}</PackageLockNotice>
          ) : null}
          <h3 className={`${SPEC_SECTION_TITLE} ${SPEC_SECTION_TITLE_MAIN}`}>Спецификация</h3>
          <p className={SPEC_HINT} style={{ marginTop: 0 }}>
            Заполните потолки объекта: полотно, ленту, багет и комплектующие из прайса. Монтаж
            оформляется на вкладке «Счёт-заказ». Полотно №1 — самое большое.
          </p>
          {priceLoading ? <p className={SPEC_HINT}>Загрузка прайса…</p> : null}
          <CeilingsSpecificationEditor
            spec={spec}
            priceItems={priceItems}
            readOnly={disabled}
            fieldClassName={SPEC_FIELD}
            fieldsRowClassName={`${SPEC_SECTION_FIELDS} ${cdProduct.doorsSpecificationFieldsRow}`}
            onChange={onSpecChange}
          />
        </div>

        <div
          className={`${cdEstimateTab.fieldSpanAll} ${cdProduct.estimateSheetField}`}
          aria-hidden
        >
          <div className={SPEC_A4_WRAP}>
            <CeilingsSpecificationPreviewSheet
              contractNumberLabel={contractNumberLabel}
              contractDateLabel={contractDateLabel}
              directorName={directorName}
              customerFullName={customerFullName}
              spec={spec}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
