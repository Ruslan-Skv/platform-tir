'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_FIELD,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireOrderInfoSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch'
>;

export function ManagerQuestionnaireOrderInfoSection({
  form,
  onPatch,
}: ManagerQuestionnaireOrderInfoSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>2) Информация о заказе (что нужно сделать?)</h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <label htmlFor="mq1_order">Суть заказа, объём, приоритеты</label>
          <textarea
            id="mq1_order"
            rows={5}
            value={q.orderInfo}
            onChange={(e) => onPatch({ orderInfo: e.target.value })}
            placeholder="Что именно хочет клиент: тип работ, помещения, сроки ожидания…"
          />
        </div>
      </div>
    </div>
  );
}
