'use client';

import { MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS } from '../../questionnaires/managerQuestionnaire1Print';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import {
  Q_CHECKS_GRID,
  Q_CHECK_ROW,
  Q_FIELD,
  Q_PANEL,
  Q_PANEL_HEAD,
  Q_PANEL_TITLE,
} from './managerQuestionnairePanelStyles';

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
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>
          Что ещё может понадобиться клиенту сейчас (отметьте при разговоре)
        </h4>
      </div>
      <div className={Q_CHECKS_GRID} role="group" aria-label="Потребности клиента">
        {MANAGER_QUESTIONNAIRE1_CLIENT_NEED_OPTIONS.map((opt) => {
          const checked = q.clientNeedsCheckedIds.includes(opt.id);
          return (
            <label key={opt.id} className={Q_CHECK_ROW}>
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
      {q.clientNeedsCheckedIds.includes('other') ? (
        <div className={Q_FIELD}>
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
  );
}
