'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdChrome from '../../../../styles/editor-chrome.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import {
  type EstimatePreviewGroupMode,
  readStoredPackageEstimatePreviewGroupMode,
  storePackageEstimatePreviewGroupMode,
  subscribePackageEstimatePreviewGroupMode,
} from '../../estimates/estimatePreviewGrouping';
import { contractDiscountHint } from '../../form/packageContractDiscount';
import { PackageDiscountControls, PackageDiscountHint } from '../shared/PackageDiscountControls';
import { PackageLockNotice, packageLockNoticeMessage } from '../shared/packageLockNoticeUi';
import attachStyles from './PackageEstimateAttach.module.css';
import { PackageEstimateAttachPanel } from './PackageEstimateAttachPanel';
import { PackageEstimateCreateModal } from './PackageEstimateCreateModal';
import { PackageEstimateMergedSheet } from './PackageEstimateMergedSheet';
import type { PackageEstimateTabProps } from './PackageEstimateTab';
import {
  ESTIMATE_BLOCK,
  ESTIMATE_DATA_COMPACT,
  ESTIMATE_FORM_GRID,
  ESTIMATE_HINT,
  ESTIMATE_SECTION_CARD,
  ESTIMATE_SECTION_FIELDS,
  ESTIMATE_SECTION_HEADER,
  ESTIMATE_SECTION_TITLE,
  ESTIMATE_SECTION_TITLE_MAIN,
  ESTIMATE_TAB_COMPACT,
  ESTIMATE_TAB_HINT,
} from './packageEstimateTabStyles';

export function PackageEstimateTabView(props: PackageEstimateTabProps) {
  const { signedDocsLocked, isProductDirectionPackage, linkedCrmCustomerId, packageId } = props;

  // Вариант отображения сметы — настройка этого договора (своя, иначе общая из «Расчётов»):
  // переключение здесь не меняет вид в других договорах и предпросмотрах расчётов.
  const [groupMode, setGroupMode] = useState<EstimatePreviewGroupMode>(() =>
    readStoredPackageEstimatePreviewGroupMode(packageId)
  );
  useEffect(() => subscribePackageEstimatePreviewGroupMode(packageId, setGroupMode), [packageId]);
  const selectGroupMode = (mode: EstimatePreviewGroupMode) => {
    setGroupMode(mode);
    storePackageEstimatePreviewGroupMode(packageId, mode);
  };

  return (
    <div
      className={`${ESTIMATE_BLOCK} ${ESTIMATE_DATA_COMPACT} ${ESTIMATE_TAB_COMPACT} ${cdProduct.windowsContractTabTypography} ${cdProduct.windowsContractEstimateTab}`}
    >
      <div className={ESTIMATE_FORM_GRID}>
        <div className={`${ESTIMATE_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          {signedDocsLocked ? (
            <PackageLockNotice>
              {packageLockNoticeMessage('estimate', {
                productDirection: isProductDirectionPackage,
              })}
            </PackageLockNotice>
          ) : null}
          <div className={ESTIMATE_SECTION_HEADER}>
            <h3 className={`${ESTIMATE_SECTION_TITLE} ${ESTIMATE_SECTION_TITLE_MAIN}`}>
              {isProductDirectionPackage ? 'Счёт-заказ' : 'Смета'}
            </h3>
          </div>
          <p className={ESTIMATE_HINT} style={{ marginTop: 0 }}>
            {isProductDirectionPackage
              ? 'Прикрепляются расчёты заказчика из раздела «Расчёты» (тот же, что выбран в блоке «Данные»). Объект выбирается здесь: все расчёты счёта-заказа должны относиться к одному объекту. После первого прикрепления объект фиксируется.'
              : 'Объект выбирается только здесь: все расчёты основной сметы и доп. соглашений должны относиться к одному объекту. После первого прикреплённого расчёта объект фиксируется автоматически.'}
          </p>
          {isProductDirectionPackage && !linkedCrmCustomerId?.trim() && !signedDocsLocked ? (
            <p className={ESTIMATE_TAB_HINT} role="status">
              Сначала выберите заказчика в блоке «Поиск заказчика в базе» на вкладке «Данные» —
              тогда появятся его расчёты для прикрепления.
            </p>
          ) : null}
          <div className={ESTIMATE_SECTION_FIELDS}>
            <PackageEstimateAttachPanel {...props} />
            {(props.form.estimate.snapshot?.rooms?.length ?? 0) > 0 ? (
              <div className={`${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateDiscountRow}`}>
                <div className={`${cdEstimateTab.field} ${cdEstimateTab.estimateDiscountField}`}>
                  <label htmlFor="estimate_discount_value">
                    {props.isProductDirectionPackage
                      ? 'Скидка на работы (счёт-заказ)'
                      : 'Скидка на работы (по смете)'}
                  </label>
                  <PackageDiscountControls
                    idPrefix="estimate_discount"
                    mode={props.form.contract.discountType}
                    percent={props.form.contract.discountPercent}
                    amount={props.form.contract.discountAmount ?? ''}
                    disabled={props.signedDocsLocked}
                    onModeChange={props.onContractDiscountTypeChange}
                    onPercentChange={props.onContractDiscountPercentChange}
                    onAmountChange={props.onContractDiscountAmountChange}
                  />
                  <PackageDiscountHint>{contractDiscountHint(props.form)}</PackageDiscountHint>
                </div>
                <div
                  className={attachStyles.estimateGroupModeSwitch}
                  role="group"
                  aria-label="Вариант отображения сметы"
                >
                  <button
                    type="button"
                    className={
                      groupMode === 'byRooms'
                        ? `${cdChrome.tab} ${cdChrome.tabActive}`
                        : cdChrome.tab
                    }
                    aria-pressed={groupMode === 'byRooms'}
                    onClick={() => selectGroupMode('byRooms')}
                  >
                    Первично по помещениям
                  </button>
                  <button
                    type="button"
                    className={
                      groupMode === 'byCategories'
                        ? `${cdChrome.tab} ${cdChrome.tabActive}`
                        : cdChrome.tab
                    }
                    aria-pressed={groupMode === 'byCategories'}
                    onClick={() => selectGroupMode('byCategories')}
                  >
                    Первично по категориям
                  </button>
                </div>
              </div>
            ) : null}
            <PackageEstimateMergedSheet {...props} groupMode={groupMode} />
            <p
              className={`${ESTIMATE_HINT} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateTabHintFullWidth}`}
            >
              Небольшой расчёт можно создать прямо здесь — кнопка «+ Создать расчёт» (он сразу
              прикрепится к этому договору). Создание и редактирование любых расчётов — в разделе{' '}
              <Link className={cdHub.link} href="/admin/contract-documents/estimates">
                «Расчёты»
              </Link>
              . В таблице сметы суммы по строкам — без скидки по договору; скидка показывается
              только в итоговом блоке. Стоимость позиций со скидкой — в «Заказ-наряды» → «Итог.
              заказ-наряд».
            </p>
          </div>
        </div>
      </div>
      <PackageEstimateCreateModal
        model={props.estimateCreate}
        isProductDirectionPackage={isProductDirectionPackage}
      />
    </div>
  );
}
