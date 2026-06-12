'use client';

import type { PackageDataTabProps } from './PackageDataTab';
import styles from './PackageDataTab.module.css';
import {
  DATA_BLANK_SHEET,
  DATA_HINT,
  DATA_PARTY_FIELD,
  DATA_SECTION_CARD,
  DATA_SECTION_FIELDS,
  DATA_SECTION_TITLE,
} from './packageDataTabStyles';
import {
  PackageDataPartySectionCollapseButton,
  PackageDataSectionLockInline,
  packageCompletionBadgeStyle,
} from './packageDataTabUi';

export type PackageDataManagerPartySectionProps = Pick<
  PackageDataTabProps,
  | 'form'
  | 'contractAndEstimateLocked'
  | 'managerSectionCompletionPercent'
  | 'managerDataSectionExpanded'
  | 'setManagerDataSectionExpanded'
>;

export function PackageDataManagerPartySection({
  form,
  contractAndEstimateLocked,
  managerSectionCompletionPercent,
  managerDataSectionExpanded,
  setManagerDataSectionExpanded,
}: PackageDataManagerPartySectionProps) {
  return (
    <div className={`${DATA_SECTION_CARD} ${DATA_BLANK_SHEET} ${styles.packageDataPartySection}`}>
      <div className={styles.packageDataPartySectionHeader}>
        <div className={styles.packageDataPartySectionTitleRow}>
          <h3 className={DATA_SECTION_TITLE}>Менеджер</h3>
          {contractAndEstimateLocked ? (
            <PackageDataSectionLockInline title="Договор подписан: блок «Менеджер» только для просмотра" />
          ) : null}
        </div>
        <div className={styles.packageDataPartySectionHeaderActions}>
          <span
            className={styles.packageDataPartySectionCompletion}
            title="Процент заполненности блока"
            style={packageCompletionBadgeStyle(managerSectionCompletionPercent)}
          >
            {managerSectionCompletionPercent}%
          </span>
          <PackageDataPartySectionCollapseButton
            expanded={managerDataSectionExpanded}
            sectionLabel="Менеджер"
            controlsId="repair-data-manager-section-body"
            onToggle={() => setManagerDataSectionExpanded((open) => !open)}
          />
        </div>
      </div>
      {managerDataSectionExpanded ? (
        <>
          <p className={`${DATA_HINT} ${styles.packageDataPartySectionIntroHint}`}>
            Данные подставляются из карточки, выбранной в блоке «Договор и объект». Редактировать
            здесь нельзя.
          </p>
          <div id="repair-data-manager-section-body" className={DATA_SECTION_FIELDS}>
            {form.executor.signatoryCrmUserId ? (
              <p
                className={`${DATA_HINT} ${styles.packageDataPartySectionFieldHint}`}
                style={{ gridColumn: '1 / -1' }}
              >
                Связь с CRM: id сотрудника{' '}
                <code style={{ fontSize: '0.9em' }}>{form.executor.signatoryCrmUserId}</code> —
                пользователь из справочника «Менеджеры».
              </p>
            ) : null}
            <div className={DATA_PARTY_FIELD}>
              <label htmlFor="e_directorNom">Менеджер (именит. падеж)</label>
              <input id="e_directorNom" readOnly value={form.executor.directorNameNominative} />
            </div>
            <div className={DATA_PARTY_FIELD}>
              <label htmlFor="e_directorGen">Менеджер (родит. падеж)</label>
              <input id="e_directorGen" readOnly value={form.executor.directorNameGenitive} />
            </div>
            <div className={DATA_PARTY_FIELD}>
              <label htmlFor="e_basis">Действует на основании</label>
              <input id="e_basis" readOnly value={form.executor.basis} />
            </div>
            <div className={DATA_PARTY_FIELD}>
              <label htmlFor="e_sales_office">Офис продаж</label>
              <input id="e_sales_office" readOnly value={form.executor.salesOffice} />
            </div>
            <div className={DATA_PARTY_FIELD}>
              <label htmlFor="e_office_phone">Телефон офиса</label>
              <input id="e_office_phone" readOnly value={form.executor.officePhone} />
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
