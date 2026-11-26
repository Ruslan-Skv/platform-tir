'use client';

import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import { Q_FIELD, Q_PANEL, Q_PANEL_HEAD, Q_PANEL_TITLE } from './managerQuestionnairePanelStyles';

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
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>4) Пожелания по мастеру (и контроль качества)</h4>
      </div>
      <div className={Q_FIELD}>
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
  );
}
