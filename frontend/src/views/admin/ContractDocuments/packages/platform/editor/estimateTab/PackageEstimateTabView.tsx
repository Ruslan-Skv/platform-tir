'use client';

import Link from 'next/link';

import cdHub from '../../../../styles/contracts-list-hub.module.css';
import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdProduct from '../../../../styles/product-package.module.css';
import { PackageLockNotice, packageLockNoticeMessage } from '../shared/packageLockNoticeUi';
import attachStyles from './PackageEstimateAttach.module.css';
import { PackageEstimateAttachPanel } from './PackageEstimateAttachPanel';
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
  const { contractAndEstimateLocked, isProductDirectionPackage, linkedCrmCustomerId } = props;

  return (
    <div
      className={`${ESTIMATE_BLOCK} ${ESTIMATE_DATA_COMPACT} ${ESTIMATE_TAB_COMPACT} ${cdProduct.windowsContractTabTypography} ${cdProduct.windowsContractEstimateTab}`}
    >
      <div className={ESTIMATE_FORM_GRID}>
        <div className={`${ESTIMATE_SECTION_CARD} ${cdProduct.windowsContractFormSection}`}>
          {contractAndEstimateLocked ? (
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
          {isProductDirectionPackage &&
          !linkedCrmCustomerId?.trim() &&
          !contractAndEstimateLocked ? (
            <p className={ESTIMATE_TAB_HINT} role="status">
              Сначала выберите заказчика в блоке «Поиск заказчика в базе» на вкладке «Данные» —
              тогда появятся его расчёты для прикрепления.
            </p>
          ) : null}
          <div className={ESTIMATE_SECTION_FIELDS}>
            <PackageEstimateAttachPanel {...props} />
            <PackageEstimateMergedSheet {...props} />
            <p
              className={`${ESTIMATE_HINT} ${cdEstimateTab.fieldSpanAll} ${attachStyles.estimateTabHintFullWidth}`}
            >
              Создание и редактирование расчётов выполняется в разделе{' '}
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
    </div>
  );
}
