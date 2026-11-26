'use client';

import { MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS } from '../../questionnaires/managerQuestionnaire1Print';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import {
  Q_CHECKS_GRID,
  Q_CHECK_ROW,
  Q_FIELD,
  Q_PANEL,
  Q_PANEL_HEAD,
  Q_PANEL_TITLE,
} from './managerQuestionnairePanelStyles';

export type ManagerQuestionnaireWhyChosenSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'form' | 'onPatch' | 'onToggleWhyChosen'
>;

export function ManagerQuestionnaireWhyChosenSection({
  form,
  onPatch,
  onToggleWhyChosen,
}: ManagerQuestionnaireWhyChosenSectionProps) {
  const q = form.managerQuestionnaire1;

  return (
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>5) Почему выбрали этого мастера / нашу компанию?</h4>
      </div>
      <div className={Q_CHECKS_GRID} role="group" aria-label="Причина выбора мастера или компании">
        {MANAGER_QUESTIONNAIRE1_WHY_CHOSEN_OPTIONS.map((opt) => {
          const checked = q.whyChosenCheckedIds.includes(opt.id);
          return (
            <label key={opt.id} className={Q_CHECK_ROW}>
              <input type="checkbox" checked={checked} onChange={() => onToggleWhyChosen(opt.id)} />
              <span>{opt.label}</span>
            </label>
          );
        })}
      </div>
      {q.whyChosenCheckedIds.includes('why_relatives') ? (
        <div className={Q_FIELD}>
          <label htmlFor="mq1_why_relatives">Чьи знакомые / родственники</label>
          <input
            id="mq1_why_relatives"
            type="text"
            value={q.whyChosenRelativesWho}
            onChange={(e) => onPatch({ whyChosenRelativesWho: e.target.value })}
            placeholder="ФИО или степень родства"
          />
        </div>
      ) : null}
      {q.whyChosenCheckedIds.includes('why_master_before') ? (
        <div className={Q_FIELD}>
          <label htmlFor="mq1_why_master_ref">№ договора / адрес предыдущего объекта</label>
          <input
            id="mq1_why_master_ref"
            type="text"
            value={q.whyChosenMasterContractOrAddress}
            onChange={(e) => onPatch({ whyChosenMasterContractOrAddress: e.target.value })}
            placeholder="Например: договор № … или адрес объекта"
          />
        </div>
      ) : null}
      {q.whyChosenCheckedIds.includes('why_manager_advised') ? (
        <div className={Q_FIELD}>
          <label htmlFor="mq1_why_manager">ФИО менеджера</label>
          <input
            id="mq1_why_manager"
            type="text"
            value={q.whyChosenManagerAdvisedName}
            onChange={(e) => onPatch({ whyChosenManagerAdvisedName: e.target.value })}
            placeholder="Кто из менеджеров порекомендовал"
          />
        </div>
      ) : null}
      {q.whyChosenCheckedIds.includes('why_review_site') ? (
        <div className={Q_FIELD}>
          <label htmlFor="mq1_why_site">Какой сайт (отзыв о мастере)</label>
          <input
            id="mq1_why_site"
            type="text"
            value={q.whyChosenReviewSite}
            onChange={(e) => onPatch({ whyChosenReviewSite: e.target.value })}
            placeholder="Например: Профи.ру, Яндекс.Карты, 2ГИС…"
          />
        </div>
      ) : null}
      {q.whyChosenCheckedIds.includes('why_other') ? (
        <div className={Q_FIELD}>
          <label htmlFor="mq1_why_other">Другая причина (уточните)</label>
          <textarea
            id="mq1_why_other"
            rows={3}
            value={q.whyChosenOtherReason}
            onChange={(e) => onPatch({ whyChosenOtherReason: e.target.value })}
            placeholder="Кратко опишите"
          />
        </div>
      ) : null}
    </div>
  );
}
