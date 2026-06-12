'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import { MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS } from '../../questionnaires/managerQuestionnaire1Print';
import {
  PACKAGE_FIELD,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_FIELDS,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireClientNeedsSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch' | 'onToggleClientNeed'
>;

export function ManagerQuestionnaireClientNeedsSection({
  form,
  onPatch,
  onToggleClientNeed,
}: ManagerQuestionnaireClientNeedsSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h4 className={PACKAGE_SECTION_TITLE}>
        Что ещё может понадобиться клиенту сейчас (отметьте при разговоре)
      </h4>
      <div className={PACKAGE_SECTION_FIELDS}>
        <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
          <div
            className={cdEstimatesList.managerQuestionnaireNeedsGrid}
            role="group"
            aria-label="Потребности клиента"
          >
            {MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS.map((opt) => {
              const checked = q.clientNeedsCheckedIds.includes(opt.id);
              return (
                <label key={opt.id} className={cdEstimatesList.managerQuestionnaireNeedRow}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleClientNeed(opt.id)}
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        {q.clientNeedsCheckedIds.includes('other') ? (
          <div className={`${PACKAGE_FIELD} ${cdEstimateTab.fieldSpanAll}`}>
            <label htmlFor="mq1_other">Уточнение к «Другое»</label>
            <textarea
              id="mq1_other"
              rows={2}
              value={q.clientNeedsOtherDetails}
              onChange={(e) => onPatch({ clientNeedsOtherDetails: e.target.value })}
              placeholder="Кратко опишите"
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
