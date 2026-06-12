'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import { MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS } from '../../questionnaires/managerQuestionnaire1Print';
import {
  PACKAGE_FIELD,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireTrafficSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch' | 'onToggleTrafficSource'
>;

export function ManagerQuestionnaireTrafficSection({
  form,
  onPatch,
  onToggleTrafficSource,
}: ManagerQuestionnaireTrafficSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>3) Откуда узнали о нас? (источник трафика)</h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <div
            className={cdEstimatesList.managerQuestionnaireNeedsGrid}
            role="group"
            aria-label="Источник трафика"
          >
            {MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS.map((opt) => {
              const checked = q.trafficSourceCheckedIds.includes(opt.id);
              return (
                <label key={opt.id} className={cdEstimatesList.managerQuestionnaireNeedRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleTrafficSource(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        {q.trafficSourceCheckedIds.includes('friends_recommendation') ? (
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_traffic_who">Кто именно порекомендовал</label>
            <input
              id="mq1_traffic_who"
              type="text"
              value={q.trafficSourceRecommendationWho}
              onChange={(e) => onPatch({ trafficSourceRecommendationWho: e.target.value })}
              placeholder="ФИО или как представился"
            />
          </div>
        ) : null}
        {q.trafficSourceCheckedIds.includes('returning_client') ? (
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_traffic_prev_contract">№ предыдущего договора</label>
            <input
              id="mq1_traffic_prev_contract"
              type="text"
              value={q.trafficSourcePreviousContractNumber}
              onChange={(e) => onPatch({ trafficSourcePreviousContractNumber: e.target.value })}
              placeholder="Например: R-012/25"
            />
          </div>
        ) : null}
        {q.trafficSourceCheckedIds.includes('traffic_other') ? (
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_traffic_other">Другое (уточните)</label>
            <textarea
              id="mq1_traffic_other"
              rows={2}
              value={q.trafficSourceOtherText}
              onChange={(e) => onPatch({ trafficSourceOtherText: e.target.value })}
              placeholder="Кратко опишите источник"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
