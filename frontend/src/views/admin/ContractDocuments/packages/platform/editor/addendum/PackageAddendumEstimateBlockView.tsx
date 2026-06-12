'use client';

import cdChrome from '../../../../styles/editor-chrome.module.css';
import { PackageLockNotice, packageLockNoticeMessage } from '../shared/packageLockNoticeUi';
import { PackageAddendumAdditionalWorksSection } from './PackageAddendumAdditionalWorksSection';
import type { PackageAddendumEstimateBlockProps } from './PackageAddendumEstimateBlockProps';
import { PackageAddendumExcludedWorksSection } from './PackageAddendumExcludedWorksSection';
import {
  ADDENDUM_BLOCK,
  ADDENDUM_DATA_COMPACT,
  ADDENDUM_FIELD,
  ADDENDUM_FORM_GRID,
  ADDENDUM_HINT,
  ADDENDUM_SECTION_CARD,
  ADDENDUM_SECTION_FIELDS,
  ADDENDUM_SECTION_HEADER,
  ADDENDUM_SECTION_TITLE,
  ADDENDUM_SECTION_TITLE_MAIN,
  ADDENDUM_TAB_COMPACT,
  ADDENDUM_TAB_HINT,
} from './packageAddendumEstimateBlockStyles';

export function PackageAddendumEstimateBlockView({
  slotOrdinal,
  slot,
  isWindowsPackage = false,
  layout = 'full',
  documentDate,
  onDocumentDateChange,
  workPeriodIncreaseDays,
  onWorkPeriodIncreaseDaysChange,
  contractEstimateObjectLabel,
  ...sectionProps
}: PackageAddendumEstimateBlockProps) {
  const readOnly = slot.status === 'SIGNED' || slot.status === 'PAID';
  const accountOrderOnly = layout === 'accountOrderOnly';

  const signedLockNotice = readOnly ? (
    <PackageLockNotice>
      {packageLockNoticeMessage('addendum', { slotOrdinal, productDirection: isWindowsPackage })}
    </PackageLockNotice>
  ) : null;

  const estimateBody = (
    <>
      {!isWindowsPackage && !accountOrderOnly ? (
        <>
          <p className={ADDENDUM_HINT}>
            Объект задаётся только на вкладке «Смета». Здесь доступны свободные расчёты того же
            объекта, что и у договорной сметы.
          </p>
          {contractEstimateObjectLabel ? (
            <p className={ADDENDUM_TAB_HINT}>
              Объект по смете договора: <strong>{contractEstimateObjectLabel}</strong>
            </p>
          ) : (
            <p className={ADDENDUM_TAB_HINT}>
              Сначала на вкладке «Смета» выберите объект и прикрепите расчёты к договору — иначе
              нельзя определить объект для Д/с.
            </p>
          )}
        </>
      ) : null}
      <div className={ADDENDUM_SECTION_FIELDS}>
        <PackageAddendumAdditionalWorksSection
          slotOrdinal={slotOrdinal}
          slot={slot}
          isWindowsPackage={isWindowsPackage}
          contractEstimateObjectLabel={contractEstimateObjectLabel}
          {...sectionProps}
        />
        <PackageAddendumExcludedWorksSection
          slotOrdinal={slotOrdinal}
          slot={slot}
          isWindowsPackage={isWindowsPackage}
          contractEstimateObjectLabel={contractEstimateObjectLabel}
          {...sectionProps}
        />
      </div>
    </>
  );

  if (accountOrderOnly) {
    return estimateBody;
  }

  return (
    <div className={`${ADDENDUM_BLOCK} ${ADDENDUM_DATA_COMPACT} ${ADDENDUM_TAB_COMPACT}`}>
      <div className={ADDENDUM_FORM_GRID}>
        <div className={ADDENDUM_SECTION_CARD}>
          <div className={ADDENDUM_SECTION_HEADER}>
            <h3 className={`${ADDENDUM_SECTION_TITLE} ${ADDENDUM_SECTION_TITLE_MAIN}`}>
              Дополнительное соглашение №{slotOrdinal}
            </h3>
          </div>
          {signedLockNotice}
          <div className={cdChrome.packageAddendumMetaInlineRow}>
            <div className={`${ADDENDUM_FIELD} ${cdChrome.packageAddendumDateFieldRow}`}>
              <label htmlFor={`repair_addendum_date_${slotOrdinal}`}>
                Дата доп. соглашения (в шапке слева)
              </label>
              <input
                id={`repair_addendum_date_${slotOrdinal}`}
                type="text"
                value={documentDate}
                onChange={(e) => onDocumentDateChange(e.target.value)}
                placeholder="напр. 04.05.2026"
                autoComplete="off"
                disabled={readOnly}
              />
            </div>
            <div
              className={`${ADDENDUM_FIELD} ${cdChrome.packageAddendumWorkPeriodIncreaseFieldRow}`}
            >
              <label htmlFor={`repair_addendum_work_period_increase_${slotOrdinal}`}>
                Увеличение срока по договору
              </label>
              <input
                id={`repair_addendum_work_period_increase_${slotOrdinal}`}
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
          {estimateBody}
        </div>
      </div>
    </div>
  );
}
