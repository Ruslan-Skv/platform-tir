'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_FIELD,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireCrossSellSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch'
>;

export function ManagerQuestionnaireCrossSellSection({
  form,
  onPatch,
}: ManagerQuestionnaireCrossSellSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>6) Дополнительные услуги (кросс-продажи)</h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <label htmlFor="mq1_cross">Интерес к доп. услугам</label>
          <textarea
            id="mq1_cross"
            rows={4}
            value={q.crossSellServices}
            onChange={(e) => onPatch({ crossSellServices: e.target.value })}
            placeholder="Дизайн, материалы «под ключ», техника, страховка…"
          />
        </div>
      </div>
    </div>
  );
}
