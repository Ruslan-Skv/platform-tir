'use client';

import cdEstimateTab from '../../../styles/estimate-tab.module.css';
import cdTemplates from '../../../styles/templates-library.module.css';
import cdWindows from '../../../styles/windows-package.module.css';

type DoorsSpecificationTabProps = {
  contractNumberLabel: string;
  contractDateLabel: string;
  disabled?: boolean;
};

/** Вкладка «Спецификация» для пакета «Двери» — заглушка до отдельной реализации. */
export function DoorsSpecificationTab({
  contractNumberLabel,
  contractDateLabel,
  disabled = false,
}: DoorsSpecificationTabProps) {
  return (
    <div
      className={`${cdWindows.blockData} ${cdWindows.dataCompact} ${cdWindows.estimateTabCompact}`}
    >
      <div className={cdWindows.formGrid}>
        <div className={cdTemplates.sectionCard}>
          <h3 className={`${cdWindows.sectionTitle} ${cdWindows.estimateSectionTitle}`}>
            Спецификация
          </h3>
          <p className={cdWindows.hint} style={{ marginTop: 0 }}>
            Раздел для направления «Двери» будет реализован отдельно от пакета «Окна». Пока здесь
            отображается только привязка к договору; состав изделий и расчёт стоимости добавятся
            позже.
          </p>
          <div className={cdEstimateTab.estimateA4Wrap}>
            <article className={cdWindows.estimateA4Sheet} data-print-target="final-estimate-sheet">
              <p className={cdWindows.estimateA4AppendixRef}>
                Приложение №1 к договору № {contractNumberLabel} от {contractDateLabel}
              </p>
              <h4 className={cdWindows.estimateA4Title}>Спецификация дверей</h4>
              <p className={cdWindows.estimateA4Empty}>
                {disabled
                  ? 'Спецификация недоступна для редактирования после подписания договора.'
                  : 'Содержимое спецификации будет добавлено в следующих версиях.'}
              </p>
            </article>
          </div>
        </div>
      </div>
    </div>
  );
}
