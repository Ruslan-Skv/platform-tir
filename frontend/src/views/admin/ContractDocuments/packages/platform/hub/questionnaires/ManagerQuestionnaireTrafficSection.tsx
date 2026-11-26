'use client';

import { MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS } from '../../questionnaires/managerQuestionnaire1Print';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import {
  Q_CHECKS_GRID,
  Q_CHECK_ROW,
  Q_FIELD,
  Q_PANEL,
  Q_PANEL_HEAD,
  Q_PANEL_TITLE,
} from './managerQuestionnairePanelStyles';

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
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>3) Откуда узнали о нас? (источник трафика)</h4>
      </div>
      <div className={Q_CHECKS_GRID} role="group" aria-label="Источник трафика">
        {MANAGER_QUESTIONNAIRE1_TRAFFIC_OPTIONS.map((opt) => {
          const checked = q.trafficSourceCheckedIds.includes(opt.id);
          return (
            <label key={opt.id} className={Q_CHECK_ROW}>
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
      {q.trafficSourceCheckedIds.includes('friends_recommendation') ? (
        <div className={Q_FIELD}>
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
        <div className={Q_FIELD}>
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
        <div className={Q_FIELD}>
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
  );
}
