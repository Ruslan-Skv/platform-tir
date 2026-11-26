'use client';

import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import { Q_FIELD, Q_PANEL, Q_PANEL_HEAD, Q_PANEL_TITLE } from './managerQuestionnairePanelStyles';

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
    <div className={Q_PANEL}>
      <div className={Q_PANEL_HEAD}>
        <h4 className={Q_PANEL_TITLE}>2) Информация о заказе (что нужно сделать?)</h4>
      </div>
      <div className={Q_FIELD}>
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
  );
}
