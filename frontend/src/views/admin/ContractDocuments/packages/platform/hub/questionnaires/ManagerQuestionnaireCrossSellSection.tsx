'use client';

import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import { Q_FIELD, Q_PANEL, Q_PANEL_HEAD, Q_PANEL_TITLE } from './managerQuestionnairePanelStyles';

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
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>6) Дополнительные услуги (кросс-продажи)</h4>
      </div>
      <div className={Q_FIELD}>
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
  );
}
