'use client';

import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';
import { Q_HEAD, Q_HINT, Q_TITLE } from './managerQuestionnairePanelStyles';

export type ManagerQuestionnaireIntroSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'syncSourceLabel'
>;

/** Шапка анкеты: заголовок и пояснения по заполнению и хранению. */
export function ManagerQuestionnaireIntroSection({
  syncSourceLabel = null,
}: ManagerQuestionnaireIntroSectionProps) {
  return (
    <div className={Q_HEAD}>
      <h3 className={Q_TITLE}>Анкета (опросник)</h3>
      <div className={Q_HINT}>
        Заполните по телефонному разговору или при личной встрече со слов клиента. Основные
        реквизиты заказчика и объекта редактируются на вкладке «Данные»; ниже — уточнения и
        маркетинговые ответы. Печать — как у других документов пакета (кнопка «Печать»).
      </div>
      {syncSourceLabel === 'crm' || syncSourceLabel === 'package' ? (
        <div className={Q_HINT}>
          Одна анкета на заказчика: данные хранятся в карточке CRM и совпадают во всех договорах
          этого клиента (Ремонт, Окна и другие направления). Изменения можно вносить в любое время.
        </div>
      ) : syncSourceLabel === 'unlinked' ? (
        <div className={Q_HINT}>
          Привяжите заказчика на вкладке «Данные» — тогда анкета будет общей для всех его договоров.
        </div>
      ) : null}
    </div>
  );
}
