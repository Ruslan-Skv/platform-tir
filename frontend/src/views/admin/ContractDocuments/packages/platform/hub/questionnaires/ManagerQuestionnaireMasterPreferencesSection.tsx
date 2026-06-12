'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import {
  PACKAGE_FIELD,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireMasterPreferencesSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch'
>;

export function ManagerQuestionnaireMasterPreferencesSection({
  form,
  onPatch,
}: ManagerQuestionnaireMasterPreferencesSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>4) Пожелания по мастеру (и контроль качества)</h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <label htmlFor="mq1_master">Пожелания</label>
          <textarea
            id="mq1_master"
            rows={4}
            value={q.masterAndQualityPreferences}
            onChange={(e) => onPatch({ masterAndQualityPreferences: e.target.value })}
            placeholder="Опыт, коммуникация, фотоотчёты, график, контрольные выезды…"
          />
        </div>
      </div>
    </div>
  );
}
