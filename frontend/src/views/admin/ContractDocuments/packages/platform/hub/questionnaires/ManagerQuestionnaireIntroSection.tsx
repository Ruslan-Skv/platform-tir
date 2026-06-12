'use client';

import cdEstimateTab from '../../../../styles/estimate-tab.module.css';
import cdEstimatesList from '../../../../styles/estimates-list.module.css';
import {
  PACKAGE_HINT,
  PACKAGE_SECTION_CARD,
  PACKAGE_SECTION_TITLE,
} from '../../ui/packageTabClassNames';
import type { PackageManagerQuestionnaire1TabProps } from './PackageManagerQuestionnaire1Tab';

export type ManagerQuestionnaireIntroSectionProps = Pick<
  PackageManagerQuestionnaire1TabProps,
  'syncSourceLabel'
>;

export function ManagerQuestionnaireIntroSection({
  syncSourceLabel = null,
}: ManagerQuestionnaireIntroSectionProps) {
  return (
    <div className={`${PACKAGE_SECTION_CARD} ${cdEstimateTab.fieldSpanAll}`}>
      <h3 className={`${PACKAGE_SECTION_TITLE} ${cdEstimatesList.managerQuestionnaire1Title}`}>
        Анкета (опросник)
      </h3>
      <p className={PACKAGE_HINT} style={{ marginTop: 0 }}>
        Заполните по телефонному разговору или при личной встрече со слов клиента. Основные
        реквизиты заказчика и объекта редактируются на вкладке «Данные»; ниже — уточнения и
        маркетинговые ответы. Печать — как у других документов пакета (кнопка «Печать»).
      </p>
      {syncSourceLabel === 'crm' || syncSourceLabel === 'package' ? (
        <p className={PACKAGE_HINT} style={{ margin: '8px 0 0' }}>
          Одна анкета на заказчика: данные хранятся в карточке CRM и совпадают во всех договорах
          этого клиента (Ремонт, Окна и другие направления). Изменения можно вносить в любое время.
        </p>
      ) : syncSourceLabel === 'unlinked' ? (
        <p className={PACKAGE_HINT} style={{ margin: '8px 0 0' }}>
          Привяжите заказчика на вкладке «Данные» — тогда анкета будет общей для всех его договоров.
        </p>
      ) : null}
    </div>
  );
}
